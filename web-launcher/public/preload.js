// Web Shim for Electron API
// Replaces the Electron preload script with fetch calls to the Node.js server

window.electronAPI = {
    bookings: createProxy('bookings'),
    clients: createProxy('clients'),
    services: createProxy('services'),
    locations: createProxy('locations'),
    vehicles: createProxy('vehicles'),
    vehicleLocations: createProxy('vehicleLocations'),
    routes: createProxy('routes'),
    geocoding: createProxy('geocoding'),
    config: {
        getGoogleMapsApiKey: () => callRpc('config', 'getGoogleMapsApiKey', [])
    }
};

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
