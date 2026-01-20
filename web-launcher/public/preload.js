// Web Shim for Electron API
// Replaces the Electron preload script with fetch calls to the Node.js server

if (!window.electronAPI) {
    const customersProxy = createProxy('customers');
    window.electronAPI = {
        bookings: createProxy('bookings'),
        customers: customersProxy,
        clients: customersProxy, // Backward compatibility alias
        services: createProxy('services'),
        locations: createProxy('locations'),
        vehicles: createProxy('vehicles'),
        vehicleLocations: createProxy('vehicleLocations'),
        routes: createProxy('routes'),
        geocoding: createProxy('geocoding'),
        activities: createProxy('activities'),
        settings: createProxy('settings'),
        config: {
            getGoogleMapsApiKey: () => callRpc('config', 'getGoogleMapsApiKey', [])
        }
    };
}

function createProxy(namespace) {
    return new Proxy({}, {
        get: (target, prop) => {
            return async (...args) => {
                return callRpc(namespace, prop, args);
            };
        }
    });
}

async function callRpc(namespace, method, args) {
    console.log(`Calling RPC: ${namespace}.${method}`, args);
    try {
        const response = await fetch('/api/rpc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ namespace, method, args })
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.warn('Unauthorized request, redirecting to login');
                window.location.href = '/login.html';
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.message || `Server error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`RPC Failed for ${namespace}.${method}:`, error);
        throw error;
    }
}

// Version Shim
window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector);
        if (element) element.innerText = text;
    };

    replaceText('chrome-version', 'Web');
    replaceText('node-version', 'Web');
    replaceText('electron-version', 'Web');
});
