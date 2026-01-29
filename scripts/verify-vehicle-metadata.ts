import { initializeSupabase } from '../src/services/supabase';
import { createVehicle, getVehicleById, updateVehicle, deleteVehicle } from '../src/services/vehicle.service';
import { config } from 'dotenv';
import { CreateVehicleInput } from '../src/types/vehicle';

config();

// Initialize Supabase client
const initResult = initializeSupabase();
if (!initResult.success) {
    console.error('Failed to initialize Supabase:', initResult.error);
    process.exit(1);
}

async function runVerification() {
    console.log('Starting Vehicle Metadata Verification...');

    let vehicleId: string | null = null;

    try {
        // 1. Create Vehicle with Metadata
        console.log('\n1. Creating vehicle with metadata...');
        const createInput: CreateVehicleInput = {
            name: 'Verify Metadata Van',
            fuelType: 'gasoline',
            status: 'available',
            metadata: {
                'color': 'Red',
                'has_ladder': true,
                'capacity': 100
            }
        };

        const createResult = await createVehicle(createInput);
        if (!createResult.success || !createResult.data) {
            throw new Error('Failed to create vehicle: ' + (createResult.error?.message || 'Unknown error'));
        }
        const createdVehicle = createResult.data;
        vehicleId = createdVehicle.id;
        console.log('Vehicle created:', vehicleId);

        if (createdVehicle.metadata?.['color'] !== 'Red' ||
            createdVehicle.metadata?.['has_ladder'] !== true) {
            throw new Error('Initial metadata mismatch');
        }
        console.log('✅ Initial metadata verified.');

        // 2. Update Vehicle - Merge Metadata
        console.log('\n2. Updating vehicle metadata (merge test)...');
        // We want to update 'color', leave 'has_ladder' alone, and add 'model_year'
        const updateInput = {
            id: vehicleId,
            metadata: {
                'color': 'Blue',
                'model_year': 2024
            }
        };

        const updateResult = await updateVehicle(updateInput);
        if (!updateResult.success || !updateResult.data) {
            throw new Error('Failed to update vehicle: ' + (updateResult.error?.message || 'Unknown error'));
        }
        const updatedVehicle = updateResult.data;

        // Check 'color' updated
        if (updatedVehicle.metadata?.['color'] !== 'Blue') {
            throw new Error(`Failed to update metadata field. Expected Blue, got ${updatedVehicle.metadata?.['color']}`);
        }
        // Check 'has_ladder' preserved (createInput had it)
        // Wait, updateVehicle logic merges with EXISTING DB data.
        if (updatedVehicle.metadata?.['has_ladder'] !== true) {
            throw new Error(`Failed to preserve existing metadata. 'has_ladder' is missing or wrong: ${updatedVehicle.metadata?.['has_ladder']}`);
        }
        // Check 'model_year' added
        if (updatedVehicle.metadata?.['model_year'] !== 2024) {
            throw new Error('Failed to add new metadata field');
        }

        console.log('✅ Metadata update merge verified.');

        // 3. Retrieve and Verify
        console.log('\n3. Retrieving vehicle to verify persistence...');
        const getResult = await getVehicleById(vehicleId);
        if (!getResult.success || !getResult.data) {
            throw new Error('Failed to get vehicle: ' + (getResult.error?.message || 'Unknown error'));
        }
        const retrievedVehicle = getResult.data;
        if (retrievedVehicle.metadata?.['color'] !== 'Blue' ||
            retrievedVehicle.metadata?.['has_ladder'] !== true ||
            retrievedVehicle.metadata?.['model_year'] !== 2024) {
            throw new Error('Persistence check failed');
        }
        console.log('✅ Metadata persistence verified.');

        console.log('\n🎉 Verification SUCCESS!');

    } catch (error) {
        console.error('\n❌ Verification FAILED:', error);
        process.exit(1);
    } finally {
        // Cleanup
        if (vehicleId) {
            console.log('\nCleaning up...');
            await deleteVehicle(vehicleId);
            console.log('Vehicle deleted.');
        }
    }
}

runVerification();
