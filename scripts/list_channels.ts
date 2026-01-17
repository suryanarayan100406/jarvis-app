import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function listChannels() {
    const { data, error } = await supabase.from('channels').select('*')
    if (error) {
        console.error(error)
    } else {
        console.log(data)
    }
}

listChannels()
