import os
import json
import jwt
import time
from typing import Dict, List, Optional
from supabase import create_client, Client, ClientOptions

class DatabaseTool:
    # Rate limiting configuration
    MAX_QUERIES_PER_MINUTE = 10
    RATE_LIMIT_WINDOW = 60  # seconds

    def __init__(self):
        self.url: str = os.environ.get("SUPABASE_URL")
        self.anon_key: str = os.environ.get("SUPABASE_ANON_KEY")
        self.jwt_secret: str = os.environ.get("SUPABASE_JWT_SECRET")
        self.schema: str = os.environ.get("SUPABASE_SCHEMA", "optiroute")
        
        # Create client with anon key
        self.client: Client = create_client(
            self.url, 
            self.anon_key,
            options=ClientOptions(schema=self.schema)
        )
        
        # Apply JWT with optiroute_viewer role for read-only access
        # This enforces RLS and uses the proper read-only role instead of bypassing security
        self._apply_readonly_jwt()
        
        # Rate limiting state
        self._query_timestamps: List[float] = []

    def _apply_readonly_jwt(self):
        """Generate and apply JWT token with optiroute_viewer role."""
        if not self.jwt_secret:
            # Fallback: try service role key if JWT secret not available
            service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            if service_key:
                self.client = create_client(
                    self.url, service_key,
                    options=ClientOptions(schema=self.schema)
                )
            return
            
        payload = {
            "role": "optiroute_viewer",
            "exp": int(time.time()) + 3600,  # 1 hour expiry
            "iat": int(time.time()),
        }
        token = jwt.encode(payload, self.jwt_secret, algorithm="HS256")
        self.client.postgrest.auth(token)

    def _check_rate_limit(self) -> bool:
        """
        Check if we're within rate limits. Returns True if query allowed, False if throttled.
        Removes expired timestamps from the window.
        """
        current_time = time.time()
        # Remove timestamps outside the window
        self._query_timestamps = [
            ts for ts in self._query_timestamps 
            if current_time - ts < self.RATE_LIMIT_WINDOW
        ]
        
        if len(self._query_timestamps) >= self.MAX_QUERIES_PER_MINUTE:
            return False
        
        self._query_timestamps.append(current_time)
        return True

    def _rate_limit_error(self) -> Dict[str, str]:
        """Return a user-friendly rate limit error message."""
        return {"error": "Too many queries. Please wait a moment before trying again."}

    def get_booking_counts_by_status(self) -> Dict[str, int]:
        """
        Get the count of bookings grouped by their status.
        Useful for answering "How many active bookings?" or "How many pending bookings?".
        """
        if not self._check_rate_limit():
            return self._rate_limit_error()
        try:
            # We fetch all bookings (or a reasonable limit) and aggregate
            # Note: For production with millions of rows, use a .count() query or RPC
            response = self.client.table("bookings").select("status").execute()
            status_counts = {}
            for row in response.data:
                status = row.get("status")
                status_counts[status] = status_counts.get(status, 0) + 1
            return status_counts
        except Exception as e:
            return {"error": str(e)}

    def get_vehicle_status(self, vehicle_query: str) -> List[Dict]:
        """
        Find a vehicle by name or license plate and return its status and details.
        
        Args:
            vehicle_query: Name or license plate to search for (e.g., "103", "Hydro Jetter")
        """
        if not self._check_rate_limit():
            return [self._rate_limit_error()]
        try:
            # Search by name OR license plate
            response = self.client.table("vehicles").select("*")\
                .or_(f"name.ilike.%{vehicle_query}%,license_plate.ilike.%{vehicle_query}%")\
                .execute()
            if not response.data:
                return [{"message": f"No vehicles found matching '{vehicle_query}'. Try a different search term."}]
            return response.data
        except Exception as e:
            return [{"error": str(e)}]

    def search_customers(self, query: str) -> List[Dict]:
        """
        Search for customers/clients by name or email using fuzzy matching.
        Handles typos, partial matches, and name variations.
        """
        if not self._check_rate_limit():
            return [self._rate_limit_error()]
        try:
            # First try exact/partial match with ILIKE (fast)
            result = self.client.from_("clients") \
                .select("*") \
                .or_(f"name.ilike.%{query}%,email.ilike.%{query}%") \
                .limit(5) \
                .execute()
            
            # If we got exact matches, return them
            if result.data and len(result.data) > 0:
                return result.data
            
            # If no exact matches, try fuzzy matching with similarity
            # Remove special characters and extra spaces for better matching
            clean_query = query.strip().replace("'", "").replace("-", " ")
            
            # Use PostgreSQL's similarity function (requires pg_trgm extension)
            # The % operator finds similar strings (default threshold is 0.3)
            fuzzy_result = self.client.from_("clients") \
                .select("*, similarity(name, '" + clean_query + "') as score") \
                .filter("name", "ilike", f"%{clean_query.split()[0]}%") \
                .limit(5) \
                .execute()
            
            if not fuzzy_result.data:
                return [{"message": f"No customers found matching '{query}'. Try a different search term or check the spelling."}]
            
            # Sort by similarity score (if available)
            results = fuzzy_result.data
            return results
            
        except Exception as e:
            # Fallback to simple ILIKE if similarity doesn't work
            try:
                fallback = self.client.from_("clients") \
                    .select("*") \
                    .ilike("name", f"%{query}%") \
                    .limit(5) \
                    .execute()
                return fallback.data if fallback.data else [{"message": f"No customers found matching '{query}'."}]
            except:
                return [{"error": str(e)}]

    def get_vehicle_count(self) -> Dict[str, int]:
        """
        Get the total number of vehicles in the fleet.
        """
        if not self._check_rate_limit():
            return self._rate_limit_error()
        try:
            # count='exact', head=True means we don't fetch data, just the count
            result = self.client.from_("vehicles").select("*", count="exact", head=True).execute()
            return {"count": result.count}
        except Exception as e:
            return {"error": str(e)}

    def get_customer_count(self) -> Dict[str, int]:
        """
        Get the total number of active customers.
        """
        if not self._check_rate_limit():
            return self._rate_limit_error()
        try:
            result = self.client.from_("clients").select("*", count="exact", head=True).eq("status", "active").execute()
            return {"count": result.count}
        except Exception as e:
            return {"error": str(e)}
    
    def list_customers(self, status: str = None) -> Dict:
        """
        List customers, optionally filtered by status.
        
        Args:
            status: Filter by status (optional). Common values: 'active', 'inactive'
        
        Returns:
            Dictionary with customer list or error
        """
        if not self._check_rate_limit():
            return self._rate_limit_error()
        try:
            query = self.client.from_("clients").select("id, name, email, phone, status")
            
            # Only apply status filter if provided
            if status:
                query = query.eq("status", status)
            
            result = query.order("name").execute()
            
            return {
                "success": True,
                "customers": result.data,
                "count": len(result.data)
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def list_active_routes(self) -> List[Dict]:
        """
        List all active routes (status != completed).
        Returns route details including scheduled date, status, and vehicle_id.
        """
        if not self._check_rate_limit():
            return [self._rate_limit_error()]
        try:
            # Column names from RouteRow interface in route.ts
            response = self.client.table("routes").select(
                "id, route_name, route_code, route_date, status, vehicle_id, total_stops, total_distance_km, total_duration_minutes"
            ).neq("status", "completed").execute()
            if not response.data:
                return [{"message": "No active routes found."}]
            return response.data
        except Exception as e:
            return [{"error": str(e)}]

    def list_vehicles(self, status: Optional[str] = None) -> List[Dict]:
        """
        List vehicles, optionally filtered by status.
        Args:
            status: Optional status to filter by (e.g., 'available', 'in_use', 'maintenance')
        """
        if not self._check_rate_limit():
            return [self._rate_limit_error()]
        try:
            query = self.client.table("vehicles").select("*")
            if status:
                # If status is 'active', we might want to include available and in_use
                if status.lower() == 'active':
                    query = query.in_("status", ["available", "in_use"])
                else:
                    query = query.eq("status", status)
            
            response = query.execute()
            if not response.data:
                return [{"message": "No vehicles found."}]
            return response.data
        except Exception as e:
            return [{"error": str(e)}]

