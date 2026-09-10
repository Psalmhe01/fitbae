package com.fitbae.app;

import android.content.ComponentName;
import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Arrays;

@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {
    private static final String[] ICONS = { "green", "blue", "pink", "purple", "brown" };
    private ComponentName component(String icon) {
        return new ComponentName(getContext(), "com.fitbae.app.Icon_" + icon);
    }
    @PluginMethod public void getIcon(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        String selected = "green";
        for (String icon : ICONS) {
            if (pm.getComponentEnabledSetting(component(icon)) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) selected = icon;
        }
        call.resolve(new JSObject().put("icon", selected));
    }
    @PluginMethod public void setIcon(PluginCall call) {
        String selected = call.getString("icon");
        if (!Arrays.asList(ICONS).contains(selected)) { call.reject("Unknown icon"); return; }
        try {
            PackageManager pm = getContext().getPackageManager();
            // Enable the new entry first so a launcher entry always exists.
            pm.setComponentEnabledSetting(component(selected), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            for (String icon : ICONS) {
                if (!icon.equals(selected)) pm.setComponentEnabledSetting(component(icon), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            }
            call.resolve(new JSObject().put("icon", selected));
        } catch (Exception error) { call.reject("Could not change app icon", error); }
    }
}
