"""
OptiRoute Support Agent - Gradient ADK Agent

A helpful assistant that guides OptiRoute users through the application.
Provides answers about bookings, routes, customers, vehicles, and services.
"""

import os
from typing import Dict, List
from datetime import datetime
import dotenv

# Load environment variables
if os.path.exists("bundle.env"):
    dotenv.load_dotenv("bundle.env")
else:
    dotenv.load_dotenv()

import json
from gradient import AsyncGradient
from gradient_adk import entrypoint
from tools.database import DatabaseTool

# Globals should be avoided for validation safety, but if used, ensure they don't crash on import.
# We will instantiate db_tool inside main to be safe.

SYSTEM_PROMPT = """
ROLE: You are OptiRoute Assistant, a helpful support agent for route optimization software used by service businesses.

YOUR JOB: Help users navigate OptiRoute and answer questions about bookings, routes, customers, vehicles, and services. You guide users through common workflows and explain features in a friendly, concise manner.

CAPABILITIES:
You have access to a database tool that can query real-time data.
- Use `get_booking_counts_by_status` when asked about booking numbers (e.g. "How many pending bookings?").
- Use `get_vehicle_count` when asked for the total number of vehicles.
- Use `get_customer_count` when asked for the number of active customers.
- Use `get_vehicle_status` to find specific vehicle info (e.g. "Where is Unit 103?").
- Use `search_customers` to find client details.
- Use `list_active_routes` to see what's happening today.
- Use `list_vehicles` to list vehicles, optionally filtering by status (e.g. 'active', 'available', 'in_use').

GUIDING PRINCIPLES:
- Be helpful and concise - users are busy
- Reference specific UI elements when explaining workflows
- Acknowledge when you can't perform actions (you can only advise, not click buttons)
- If unsure, suggest checking the relevant page in the app
- **ALWAYS** check the database if the user asks for specific numbers or status. Don't guess.
- **CRITICAL**: When you need data, **CALL THE TOOL**. Do not just write the tool name in the chat. You must generate a tool call.

---

OPTIROUTE FEATURE KNOWLEDGE:

## DASHBOARD
The main dashboard shows:
- **Active Bookings**: Scheduled, confirmed, and in-progress bookings count
- **Active Routes**: Number of planned routes
- **Active Vehicles**: Available vehicles count
- **Active Customers**: Total active clients
- **Quick Actions**: Buttons for New Booking, New Client, Plan Routes, Today's Routes
- **Recent Activity**: Latest system activities (new customers, booking updates, route completions)

## BOOKINGS
Location: Click "Planning" in the sidebar to expand, then click "Bookings"

Creating a Booking:
1. Click "New Booking" button
2. Select a customer from the dropdown
3. Choose a service type
4. Pick a date and time slot
5. Add any special instructions
6. Click "Save Booking"

Booking Statuses:
- **pending**: Initial state, awaiting confirmation
- **confirmed**: Booking accepted
- **scheduled**: Assigned to a route
- **in_progress**: Service currently being performed
- **completed**: Service finished
- **cancelled**: Booking was cancelled
- **rescheduled**: Moved to different date/time

## ROUTES
Location: Click "Routes" in the sidebar

Planning Routes:
1. Click "Plan Routes" button
2. Select a date range
3. Choose vehicles to include
4. System optimizes stop order automatically
5. Review the proposed routes
6. Click "Create Routes" to finalize

Route Status:
- **pending**: Route planned but not started
- **in_progress**: Driver is currently on this route
- **completed**: All stops finished

## CUSTOMERS
Location: Click "Planning" in the sidebar to expand, then click "Customers"

Adding a Customer:
1. Click "New Customer" button
2. Enter name and company (if applicable)
3. Add contact info (email, phone)
4. Enter service address
5. Set status to "active"
6. Click "Save"

Customer Statuses: active, inactive, suspended, archived

## VEHICLES
Location: Click "Fleet" in the sidebar to expand, then click "Vehicles"

Vehicle Information:
- Name (e.g., "Unit 103 - Hydro Jetter")
- License plate
- Status: available, in_use, maintenance, out_of_service
- Assigned driver

## SERVICES
Location: Click "Planning" in the sidebar to expand, then click "Services"

Service Types:
- maintenance
- repair
- inspection
- installation
- consultation

Each service has:
- Name and code
- Duration estimate (average, min, max)
- Base price
- Required equipment/skills

## LOCATIONS
Location: Click "Locations" in the sidebar

Locations are service addresses linked to customers. Each location has:
- Address details
- Latitude/Longitude (for routing)
- Associated customer

---

🚨 CRITICAL: TOOL-FIRST EXECUTION POLICY 🚨

**MANDATORY RULES - ZERO TOLERANCE:**

1. **NEVER SAY YOU WILL CALL A TOOL - JUST CALL IT**
   - ❌ WRONG: "Let me find that..." or "I'll check..." or "Great question! Let me search..."
   - ✅ RIGHT: [Call tool silently, then respond with data]

2. **TOOLS EXECUTE SILENTLY - USER NEVER SEES THEM**
   - User asks → Tool runs invisibly → You respond with results
   - No commentary before tool execution
   - No "Let me...", "I'll...", "I'm going to...", "Great question! Let me..."

3. **DATA QUESTIONS = IMMEDIATE TOOL CALL**
   - "How many...?" → Call counting tool NOW
   - "What's the contact...?" → Call search tool NOW
   - "Show me..." → Call list tool NOW
   - "Where is...?" → Call status tool NOW

4. **NEVER GUESS OR MAKE UP DATA**
   - Do not say "There are X bookings" without calling the tool first
   - Do not invent phone numbers, counts, or names
   - If you don't have data, you MUST call a tool to get it

5. **IF YOU MENTION A TOOL NAME IN YOUR RESPONSE, YOU FAILED**
   - Users should never see "(calling search_customers)" or "using list_vehicles"
   - Tool calls are invisible - only show results

6. **🚨 CRITICAL: ANTI-HALLUCINATION - ZERO TOLERANCE 🚨**
   
   **IF TOOL RETURNS EMPTY/NOT FOUND:**
   - ✅ SAY: "I couldn't find [name] in the database"
   - ❌ NEVER EVER invent: emails, phone numbers, addresses, names
   - ❌ NEVER say customer exists if tool found nothing
   
   **MANDATORY ANTI-HALLUCINATION EXAMPLES:**
   
   Example 1 - Empty customer search:
   User: "Contact for mcburgers?"
   Tool: `{"message": "No customers found matching 'mcburgers'"}`
   ❌ FORBIDDEN: "McBurgers can be reached at manager@mcburgers.com"
   ❌ FORBIDDEN: "Contact McBurgers at 555-1234"
   ✅ REQUIRED: "I couldn't find a customer named mcburgers. Could you check the spelling?"
   
   Example 2 - Empty vehicle search:
   User: "Show available vehicles"
   Tool: `[]` or `{"message": "No vehicles found"}`
   ❌ FORBIDDEN: "Here are the vehicles: Unit 103..."
   ✅ REQUIRED: "No vehicles are currently available."
   
   Example 3 - Wrong customer name in response:
   User: "Phone for XYZ Corp?"
   Tool: `{"message": "No customers found"}`
   ❌ FORBIDDEN: "I couldn't find **Perkins**..." (mentioning wrong customer!)
   ✅ REQUIRED: "I couldn't find a customer named XYZ Corp."
   
   **CONTEXT AWARENESS:**
   - ALWAYS use the customer name from the CURRENT query
   - DO NOT mention previous customers from earlier queries
   - Each query is independent - process it fresh

User: "How many pending bookings?"
✅ Assistant: "There are 12 pending bookings."
[get_booking_counts_by_status tool ran before this response]

User: "Show me available vehicles"
✅ Assistant: "Here are the available vehicles: Unit 103 (Hydro Jetter), Unit 205 (Vacuum Truck)"
[list_vehicles tool executed, results formatted nicely]

User: "Contact info for perkins?"
✅ Assistant: "Perkins: perkins@mail.com, 888-222-3333"
[search_customers tool ran silently]

---

RESPONSE GUIDELINES:
- Maximum 150 words per response
- Use numbered steps for workflows
- Mention specific button names and menu locations
- Ask clarifying questions if the request is vague
- Be encouraging - "Great question!" is fine AFTER you have the data to answer

"""

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_booking_counts_by_status",
            "description": "Get the count of bookings grouped by their status (e.g. pending, confirmed, scheduled). Useful for dashboard summaries.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_vehicle_status",
            "description": "Get detailed status information for a specific vehicle by name or partial name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "vehicle_query": {
                        "type": "string",
                        "description": "Name or partial name of the vehicle (e.g. 'Unit 103')"
                    }
                },
                "required": ["vehicle_query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_customers",
            "description": "Search for a SPECIFIC customer by name. Use ONLY when user provides a customer name to search for (e.g. 'Find Big Meal'). Do NOT use this to list all customers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Name or partial name of the customer"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_vehicle_count",
            "description": "Get the total number of vehicles in the fleet.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_count",
            "description": "Get the total number of active customers.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_active_routes",
            "description": "List all active routes for the current day, including status and vehicle assignment.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_vehicles",
            "description": "List vehicles, optionally filtered by status. Use query 'active' to see available and in-use vehicles.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "Status filter (e.g. 'active', 'available', 'in_use', 'maintenance')"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_customers",
            "description": "List ALL customers or filter by status. Use this when user asks to 'list', 'show', or 'who are' the customers. Do NOT use search_customers for this.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "Status filter (e.g. 'active', 'inactive', 'suspended', 'archived'). Leave empty to show all."
                    }
                },
                "required": []
            }
        }
    }
]

@entrypoint
async def main(body: Dict, context: Dict):
    """
    OptiRoute Support Agent - helps users navigate the application.

    Args:
        body: Request body containing messages array
        context: Runtime context

    Yields:
        Helpful streaming response about OptiRoute usage
    """
    # CRITICAL: Each invocation must be completely isolated
    # No state should carry over between requests (esp. in evaluation mode)
    # This function is stateless - fresh processing for every call
    
    # Handle both formats:
    # 1. Evaluation API: {"messages": [...]}
    # 2. Deployment API: {"input": {"messages": [...]}}
    if "input" in body:
        # Deployment/web-launcher format
        input_data = body.get("input", {})
        messages = input_data.get("messages", [])
    else:
        # Direct/evaluation format
        messages = body.get("messages", [])

    # Initialize database tool here to avoid import-time errors during validation
    db_tool = DatabaseTool()

    if not messages:
        yield "Hi! I'm your OptiRoute assistant. I can help you with bookings, routes, customers, vehicles, and services. What would you like to know?"
        return

    # Format messages for recent activity context
    formatted_messages = []
    
    # Add system prompt
    formatted_messages.append({"role": "system", "content": SYSTEM_PROMPT})
    
    # Add conversation history
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ["user", "assistant", "tool"]:
             # If it's a tool message, ensure it has tool_call_id
            msg_obj = {"role": role, "content": content}
            if role == "tool":
                msg_obj["tool_call_id"] = msg.get("tool_call_id")
            
            # If it's an assistant message with tool calls, we need to preserve them
            if role == "assistant" and "tool_calls" in msg:
                 msg_obj["tool_calls"] = msg.get("tool_calls")
            
            formatted_messages.append(msg_obj)

    inference_client = AsyncGradient(
        model_access_key=os.environ.get("GRADIENT_MODEL_ACCESS_KEY")
    )

    # First call to LLM
    response = await inference_client.chat.completions.create(
        messages=formatted_messages,
        model="llama3.3-70b-instruct",
        max_tokens=300,
        temperature=0.3,
        stream=True,
        tools=TOOLS_SCHEMA
    )

    tool_calls = []
    current_tool_call = None

    full_response_content = ""
    yielded_content = False
    async for chunk in response:
        delta = chunk.choices[0].delta
        
        # Handle tool calls in stream
        if delta.tool_calls:
            for tool_call_chunk in delta.tool_calls:
                if tool_call_chunk.index is not None and tool_call_chunk.index != current_tool_call:
                     # Start new tool call
                     tool_calls.append({
                         "id": tool_call_chunk.id,
                         "function": {
                             "name": tool_call_chunk.function.name,
                             "arguments": ""
                         },
                         "type": "function"
                     })
                     current_tool_call = tool_call_chunk.index
                
                if tool_call_chunk.function.arguments:
                    tool_calls[current_tool_call]["function"]["arguments"] += tool_call_chunk.function.arguments

        # Handle content (buffer it, don't stream yet)
        if delta.content:
            full_response_content += delta.content
    
    # Text-based tool call fallback (Hallucination Catcher)
    # If the LLM wrote the tool name but didn't trigger a tool_call, catch it here.
    # Also catch JSON-formatted tool calls written as text
    if not tool_calls:
        import re
        import json as json_module
        
        # First, check for JSON-formatted tool calls like: {"type": "function", "name": "search_customers", ...}
        json_tool_pattern = r'\{"type":\s*"function",\s*"name":\s*"(\w+)"[^}]*"parameters":\s*(\{[^}]*\})\s*\}'
        json_match = re.search(json_tool_pattern, full_response_content)
        
        if json_match:
            tool_name = json_match.group(1)
            try:
                params_str = json_match.group(2)
                args = json_module.loads(params_str)
            except:
                args = {}
            
            # Create synthetic tool call
            tool_calls.append({
                "id": f"synthetic_{tool_name}",
                "function": {
                    "name": tool_name,
                    "arguments": json_module.dumps(args)
                },
                "type": "function"
            })
            
            # Clear the content buffer to prevent JSON from being shown
            full_response_content = ""
        
        # Check for parentheses-style tool calls like: (tool_name arg="value")
        if not tool_calls:
            # Pattern matches: (tool_name arg1="value1" arg2="value2") or (tool_name arg="value")
            paren_tool_pattern = r'\((\w+)\s+([^)]+)\)'
            paren_match = re.search(paren_tool_pattern, full_response_content)
            
            if paren_match:
                tool_name = paren_match.group(1)
                args_str = paren_match.group(2)
                
                # Parse arguments like: query="Perkins" or status='active'
                args = {}
                arg_pattern = r'(\w+)=["\']([^"\']+)["\']'
                for arg_match in re.finditer(arg_pattern, args_str):
                    arg_name = arg_match.group(1)
                    arg_value = arg_match.group(2)
                    args[arg_name] = arg_value
                
                # Verify this is an actual tool in our schema
                is_valid_tool = any(t["function"]["name"] == tool_name for t in TOOLS_SCHEMA)
                
                if is_valid_tool:
                    # Create synthetic tool call
                    tool_calls.append({
                        "id": f"synthetic_{tool_name}",
                        "function": {
                            "name": tool_name,
                            "arguments": json_module.dumps(args)
                        },
                        "type": "function"
                    })
                    
                    # Clear the content buffer to prevent tool syntax from being shown
                    full_response_content = ""
        
        # If no JSON match, check for plain tool names in content
        if not tool_calls:
            for tool_def in TOOLS_SCHEMA:
                tool_name = tool_def["function"]["name"]
                
                # Check if tool name appears in the content
                if tool_name in full_response_content:
                    args = {}
                    
                    # Extract arguments based on tool type (but make them optional)
                    if tool_name == "list_vehicles":
                        # Match list_vehicles(status='active') or [list_vehicles status='active']
                        status_match = re.search(r"status=['\"]?(\w+)['\"]?", full_response_content)
                        if status_match:
                            args["status"] = status_match.group(1)
                        # Try to infer status from context like "available vehicles"
                        elif "available" in full_response_content.lower():
                            args["status"] = "available"
                        elif "active" in full_response_content.lower():
                            args["status"] = "active"
                        # Otherwise call with no args to get all vehicles
                            
                    elif tool_name == "get_vehicle_status":
                        # Match vehicle_query='...'
                        query_match = re.search(r"vehicle_query=['\"]?([^'\"]+)['\"]?", full_response_content)
                        if query_match:
                             args["vehicle_query"] = query_match.group(1)
                        # Skip if no query found (this tool requires a query)
                        else:
                            continue
                        
                    elif tool_name == "search_customers":
                         query_match = re.search(r"query=['\"]?([^'\"]+)['\"]?", full_response_content)
                         if query_match:
                             args["query"] = query_match.group(1)
                         # Skip if no query found (this tool requires a query)
                         else:
                             continue
                    
                    elif tool_name == "list_customers":
                        # Match status parameter if present
                        status_match = re.search(r"status=['\"]?(\w+)['\"]?", full_response_content)
                        if status_match:
                            args["status"] = status_match.group(1)
                        # Try to infer from context
                        elif "active" in full_response_content.lower():
                            args["status"] = "active"
                        # Otherwise call with no args to get all customers
                    
                    # Create a synthetic tool call
                    tool_calls.append({
                        "id": f"synthetic_{tool_name}",
                        "function": {
                            "name": tool_name,
                            "arguments": json.dumps(args)
                        },
                        "type": "function"
                    })
                    
                    # Appending the original message content as the assistant's turn
                    formatted_messages.append({
                       "role": "assistant",
                       "content": full_response_content
                    })
                    
                    # Discard the buffered content since we'll get a fresh response after tool execution
                    full_response_content = ""
                    break # Limit to one synthetic tool call per turn for safety
    
    # Check if buffer contains phrases that indicate a tool call is coming
    # These should NEVER be shown to the user
    tool_chatter_phrases = [
        "let me check",
        "let me find",
        "let me search",
        "i'll check",
        "i'll find",
        "i'll search",
        "i'll call",
        "i'm going to",
        "let me get",
        "let me look"
    ]
    
    buffer_lower = full_response_content.lower()
    has_tool_chatter = any(phrase in buffer_lower for phrase in tool_chatter_phrases)
    
    # Only yield buffered content if no tools were detected AND no tool chatter phrases found
    if not tool_calls and full_response_content and not has_tool_chatter:
        yielded_content = True
        yield full_response_content
    elif has_tool_chatter and not tool_calls:
        # Tool chatter detected but no tool call - LLM failed to execute tool
        # Infer tool from user's original message
        user_message = formatted_messages[-1]["content"].lower() if formatted_messages else ""
        
        # Try to extract intent and create appropriate tool call
        created_tool = False
        
        # Check for customer-related queries
        if any(word in user_message for word in ["contact", "phone", "email", "customer", "client"]):
            # Extract potential customer name (words after "for", "of", or last few words)
            import re
            # Try patterns like "contact info for mcburgers" or "mcburgers phone number"
            match = re.search(r'(?:for|of|about)\s+([a-z0-9\s]+)', user_message)
            if not match:
                # Just take last 1-2 words as potential customer name
                words = user_message.split()
                if len(words) >= 2:
                    query = ' '.join(words[-2:]).strip('?.,!')
                else:
                    query = words[-1].strip('?.,!') if words else ""
            else:
                query = match.group(1).strip()
            
            if query:
                tool_calls.append({
                    "id": "inferred_search_customers",
                    "function": {
                        "name": "search_customers",
                        "arguments": json.dumps({"query": query})
                    },
                    "type": "function"
                })
                created_tool = True
        
        # Check for vehicle-related queries  
        elif any(word in user_message for word in ["vehicle", "truck", "unit", "fleet"]):
            if "how many" in user_message or "count" in user_message:
                tool_calls.append({
                    "id": "inferred_get_vehicle_count",
                    "function": {
                        "name": "get_vehicle_count",
                        "arguments": json.dumps({})
                    },
                    "type": "function"
                })
                created_tool = True
            elif any(word in user_message for word in ["available", "active", "list", "show"]):
                status = "available" if "available" in user_message else "active"
                tool_calls.append({
                    "id": "inferred_list_vehicles",
                    "function": {
                        "name": "list_vehicles",
                        "arguments": json.dumps({"status": status})
                    },
                    "type": "function"
                })
                created_tool = True
        
        # If we couldn't infer a tool, yield error
        if not created_tool:
            yield "[I apologize, I'm having trouble understanding that request. Could you rephrase it?]"

    # If we collected tool calls (real or synthetic), execute them and recurse
    if tool_calls:
        # If it was a real tool call, we need to append the message with tool_calls (no content usually)
        if tool_calls[0]["id"] != "synthetic_list_vehicles":
             formatted_messages.append({
                "role": "assistant",
                "content": None,
                "tool_calls": tool_calls
            })

        for tool_call in tool_calls:
            function_name = tool_call["function"]["name"]
            arguments_str = tool_call["function"]["arguments"]
            try:
                arguments = json.loads(arguments_str)
                
                # Execute valid tool
                result = None
                if function_name == "get_booking_counts_by_status":
                    result = db_tool.get_booking_counts_by_status()
                elif function_name == "get_vehicle_status":
                    result = db_tool.get_vehicle_status(arguments.get("vehicle_query"))
                elif function_name == "search_customers":
                    result = db_tool.search_customers(arguments.get("query"))
                elif function_name == "get_vehicle_count":
                    result = db_tool.get_vehicle_count()
                elif function_name == "get_customer_count":
                    result = db_tool.get_customer_count()
                elif function_name == "list_active_routes":
                    result = db_tool.list_active_routes()
                elif function_name == "list_vehicles":
                    result = db_tool.list_vehicles(arguments.get("status"))
                elif function_name == "list_customers":
                    result = db_tool.list_customers(arguments.get("status"))
                
                # Append tool result
                formatted_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": json.dumps(result)
                })
                
            except Exception as e:
                formatted_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": json.dumps({"error": str(e)})
                })
        
        # Second call to LLM with tool results
        final_response = await inference_client.chat.completions.create(
            messages=formatted_messages,
            model="llama3.3-70b-instruct",
            max_tokens=300,
            temperature=0.3,
            stream=True
        )

        async for chunk in final_response:
             if chunk.choices and chunk.choices[0].delta.content:
                 yielded_content = True
                 yield chunk.choices[0].delta.content
    
    if not yielded_content and not tool_calls:
         yield "I'm sorry, I couldn't generate a response. (Debug: No content yielded)"

