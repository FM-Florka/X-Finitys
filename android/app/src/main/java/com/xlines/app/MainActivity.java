package com.xlines.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.Plugin;

import org.json.JSONObject;
import org.json.JSONException;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure cookies are accepted and persisted across app sessions
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(this.getWebView(), true);

        // For Android 5.0+ (Lollipop+), enable third-party cookie persistence
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(this.getWebView(), true);
        }
    }

    @Override
    public void onBackPressed() {
        // Get the current URL from the WebView
        String currentUrl = "";
        if (getBridge() != null && getBridge().getWebView() != null) {
            currentUrl = getBridge().getWebView().getUrl();
        }

        // If we're at the login page, exit the app (minimize)
        if (currentUrl != null && currentUrl.contains("/login")) {
            // Move task to back (minimize app) instead of finishing
            moveTaskToBack(true);
            return;
        }

        // For all other pages, try to go back in WebView history
        if (getBridge() != null && getBridge().getWebView() != null && getBridge().getWebView().canGoBack()) {
            getBridge().getWebView().goBack();
        } else {
            // No history to go back to, minimize app
            moveTaskToBack(true);
        }
    }
}