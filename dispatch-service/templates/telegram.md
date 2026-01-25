🚚 **Route Assignment**

Hello **{{driver.fullName}}**!

You have been assigned a new route:

📋 **Route:** {{route.name}}
📅 **Date:** {{route.date}}
⏰ **Start Time:** {{route.plannedStartTime}}
📍 **Total Stops:** {{route.totalStops}}

{{#if routeMapsUrl}}
🗺️ [View Route Map]({{routeMapsUrl}})
{{/if}}

{{#if vehicle}}
🚗 **Vehicle:** {{vehicle.name}}
{{#if vehicle.licensePlate}}🔢 **License Plate:** {{vehicle.licensePlate}}{{/if}}
{{/if}}

---

**Stops:**

{{#each bookings}}
**{{stopNumber}}.** {{clientName}}
📍 {{address}}
{{#if mapsUrl}}🗺️ [Navigate]({{mapsUrl}}){{/if}}
{{#if scheduledTime}}⏰ {{scheduledTime}}{{/if}}
{{#if services}}📦 {{services}}{{/if}}
{{#if specialInstructions}}⚠️ _{{specialInstructions}}_{{/if}}

{{/each}}

---

_Dispatched at: {{dispatchedAt}}_
