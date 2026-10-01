require('dotenv').config({path:'.env.local',quiet:true});const {createClient}=require('@supabase/supabase-js');
const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('profiles').select('id').limit(1).then(r=>{ if(r.error){console.log('missing');process.exit(1)} console.log('ready'); });
