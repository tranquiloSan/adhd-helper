package io.github.tranquilosan.adhdhelper;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins have to be registered before the bridge starts.
        registerPlugin(AlarmsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
