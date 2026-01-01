const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Add any API methods here
    sendMessage: (message) => ipcRenderer.send('message', message),
    clients: {
        getAll: (filters) => ipcRenderer.invoke('clients:getAll', filters),
        create: (client, options) => ipcRenderer.invoke('clients:create', client, options),
        update: (client) => ipcRenderer.invoke('clients:update', client),
        delete: (id) => ipcRenderer.invoke('clients:delete', id),
        getById: (id) => ipcRenderer.invoke('clients:getById', id)
    },
    services: {
        getAll: (filters) => ipcRenderer.invoke('services:getAll', filters),
        create: (service) => ipcRenderer.invoke('services:create', service),
        update: (service) => ipcRenderer.invoke('services:update', service),
        delete: (id) => ipcRenderer.invoke('services:delete', id),
        getById: (id) => ipcRenderer.invoke('services:getById', id)
    },
    bookings: {
        getAll: (filters, pagination) => ipcRenderer.invoke('bookings:getAll', filters, pagination),
        create: (booking) => ipcRenderer.invoke('bookings:create', booking),
        update: (booking) => ipcRenderer.invoke('bookings:update', booking),
        delete: (id) => ipcRenderer.invoke('bookings:delete', id),
        getById: (id) => ipcRenderer.invoke('bookings:getById', id)
    },
    locations: {
        getAll: (filters) => ipcRenderer.invoke('locations:getAll', filters),
        create: (location) => ipcRenderer.invoke('locations:create', location),
        update: (location) => ipcRenderer.invoke('locations:update', location),
        delete: (id) => ipcRenderer.invoke('locations:delete', id),
        getById: (id) => ipcRenderer.invoke('locations:getById', id)
    },
    vehicles: {
        getAll: (filters) => ipcRenderer.invoke('vehicles:getAll', filters),
        create: (vehicle) => ipcRenderer.invoke('vehicles:create', vehicle),
        update: (vehicle) => ipcRenderer.invoke('vehicles:update', vehicle),
        delete: (id) => ipcRenderer.invoke('vehicles:delete', id),
        getById: (id) => ipcRenderer.invoke('vehicles:getById', id)
    },
    vehicleLocations: {
        getByVehicle: (vehicleId) => ipcRenderer.invoke('vehicleLocations:getByVehicle', vehicleId),
        set: (vehicleId, locations) => ipcRenderer.invoke('vehicleLocations:set', vehicleId, locations),
        add: (vehicleId, locationId, isPrimary) => ipcRenderer.invoke('vehicleLocations:add', vehicleId, locationId, isPrimary),
        remove: (vehicleId, locationId) => ipcRenderer.invoke('vehicleLocations:remove', vehicleId, locationId),
        setPrimary: (vehicleId, locationId) => ipcRenderer.invoke('vehicleLocations:setPrimary', vehicleId, locationId)
    },
    routes: {
        getAll: (filters, pagination) => ipcRenderer.invoke('routes:getAll', filters, pagination),
        create: (route) => ipcRenderer.invoke('routes:create', route),
        update: (route) => ipcRenderer.invoke('routes:update', route),
        delete: (id) => ipcRenderer.invoke('routes:delete', id),
        getById: (id) => ipcRenderer.invoke('routes:getById', id),
        plan: (input) => ipcRenderer.invoke('routes:plan', input),
        previewPlan: (input) => ipcRenderer.invoke('routes:previewPlan', input),
        getNextAvailableDate: (fromDate) => ipcRenderer.invoke('routes:getNextAvailableDate', fromDate),
        getStatsByDateRange: (startDate, endDate) => ipcRenderer.invoke('routes:getStatsByDateRange', startDate, endDate)
    },
    geocoding: {
        autocomplete: (input) => ipcRenderer.invoke('geocoding:autocomplete', input),
        geocodeAddress: (address) => ipcRenderer.invoke('geocoding:geocodeAddress', address)
    },
    config: {
        getGoogleMapsApiKey: () => ipcRenderer.invoke('config:getGoogleMapsApiKey')
    }
});

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector);
        if (element) element.innerText = text;
    };

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type]);
    }
});
