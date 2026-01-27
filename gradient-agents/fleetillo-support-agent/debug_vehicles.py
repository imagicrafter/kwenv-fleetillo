
import os
import json
import asyncio
from dotenv import load_dotenv
from tools.database import DatabaseTool

# Load environment variables
load_dotenv(dotenv_path=".env")

def debug_vehicle_query():
    print("DEBUG: initializing DB tool...")
    
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    print(f"DEBUG: URL: {url}")
    print(f"DEBUG: Key Present: {bool(key)}")
    if key:
        print(f"DEBUG: Key Starts with: {key[:10]}...")

    db = DatabaseTool()
    
    # Simulate what the agent might be doing: searching with an empty string or "unit"
    print("\n--- Query: '' (Empty String) ---")
    results_empty = db.get_vehicle_status("")
    print(f"Count: {len(results_empty)}")
    print(f"Raw: {results_empty}")
    for v in results_empty:
        print(f"- {v.get('name')} ({v.get('status')})")

    print("\n--- Query: 'Unit' ---")
    results_unit = db.get_vehicle_status("Unit")
    print(f"Count: {len(results_unit)}")

    print("\n--- Booking Counts ---")
    results_bookings = db.get_booking_counts_by_status()
    print(f"Bookings: {results_bookings}")

    print("\n--- NEW: Vehicle Count Tool ---")
    v_count = db.get_vehicle_count()
    print(f"Vehicle Count: {v_count}")

    print("\n--- NEW: Customer Count Tool ---")
    c_count = db.get_customer_count()
    print(f"Customer Count: {c_count}")

    # Issue 4: Test empty result handling
    print("\n--- Issue 4: Empty Result Test (nonexistent vehicle) ---")
    empty_vehicle = db.get_vehicle_status("ZZZZNONEXISTENT")
    print(f"Result: {empty_vehicle}")

    print("\n--- Issue 4: Empty Result Test (nonexistent customer) ---")
    empty_customer = db.search_customers("ZZZZNONEXISTENT")
    print(f"Result: {empty_customer}")

    # Issue 5: Test list_active_routes with joins
    print("\n--- Issue 5: list_active_routes (with driver/vehicle joins) ---")
    routes = db.list_active_routes()
    print(f"Active Routes Count: {len(routes)}")
    print(f"Routes Data: {routes}")
    
if __name__ == "__main__":
    debug_vehicle_query()

