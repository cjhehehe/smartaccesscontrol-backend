import supabase from '../config/supabase.js';

export const getSystemSetting = async (settingName) => {
    return await supabase.from('system_settings').select('setting_value').eq('setting_name', settingName).single();
};

export const updateSystemSetting = async (settingName, value) => {
    return await supabase
        .from('system_settings')
        .update({ setting_value: value, updated_at: new Date() })
        .eq('setting_name', settingName);
};
