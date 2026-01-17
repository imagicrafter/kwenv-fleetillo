
import 'dotenv/config';
import { createTelegramWebhookHandler, getDriverById } from './api/handlers/telegram.js';
import { getSupabaseClient } from './db/supabase.js';

// Mock Express objects
const mockRes = () => {
    const res: any = {};
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        res.jsonData = data;
        return res;
    };
    return res;
};

async function verifyFlow() {
    console.log('🚀 Starting Telegram Registration Flow Verification...');

    const testId = '00000000-0000-4000-a000-000000000000'; // Specific UUID for testing
    let client;

    try {
        // Debug Auth
        console.log('Environment Check:', {
            URL: !!process.env.SUPABASE_URL,
            KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.SUPABASE_ANON_KEY
        });

        client = getSupabaseClient();
        // 1. Setup Test Driver
        console.log('1. Setting up test driver...');

        // Cleanup if exists
        await client.from('drivers').delete().eq('id', testId);

        // Create
        const { error: insertError } = await client.from('drivers').insert({
            id: testId,
            first_name: 'Test',
            last_name: 'Driver',
            status: 'active',
            email: 'test.driver@example.com'
        });

        if (insertError) throw new Error(`Failed to insert driver: ${insertError.message}`);
        console.log('✅ Test driver created');

        // 2. Call Webhook Handler
        console.log('2. Simulating Webhook /start command...');
        const handler = createTelegramWebhookHandler();

        const req: any = {
            body: {
                update_id: 123456,
                message: {
                    message_id: 1,
                    from: {
                        id: 999888777,
                        is_bot: false,
                        first_name: 'Tester',
                        username: 'tester_user'
                    },
                    chat: {
                        id: 999888777,
                        type: 'private',
                        first_name: 'Tester'
                    },
                    date: Date.now(),
                    text: `/start ${testId}`
                }
            }
        };

        const res = mockRes();
        await handler(req, res);

        // 3. Verify Result
        console.log('3. Verifying database state...');

        const driver = await getDriverById(testId);
        if (!driver) throw new Error('Driver not found after check');

        if (driver.telegramChatId === '999888777') {
            console.log('✅ SUCCESS: Driver telegram_chat_id updated correctly!');
        } else {
            console.error('❌ FAILURE: Driver telegram_chat_id mismatch', driver.telegramChatId);
            process.exit(1);
        }

        // 4. Test "Already Registered" Logic
        console.log('4. Testing "Already Registered" logic...');
        await handler(req, res); // Call again
        // We can't easily check the side effect (message sent) without mocking fetch, 
        // but we can ensure no error loop or crash.
        console.log('✅ Handled duplicate properly (no crash)');

    } catch (err: any) {
        console.error('❌ ERROR:', err.message);
        process.exit(1);
    } finally {
        // Cleanup
        console.log('🧹 Cleaning up...');
        if (client) {
            await client.from('drivers').delete().eq('id', testId);
        }
    }
}

verifyFlow();
