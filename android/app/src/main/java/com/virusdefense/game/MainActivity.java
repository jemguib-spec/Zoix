package com.virusdefense.game;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import org.json.JSONObject;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Affiche le jeu (fichiers HTML/JS embarqués dans l'APK) en plein écran. */
public class MainActivity extends Activity {
    private WebView web;
    private boolean pageReady = false;
    private String pendingLevel = null;
    private PermissionRequest pendingPerm = null;    // caméra demandée par le jeu (scanner un QR code)
    private ValueCallback<Uri[]> fileCb = null;       // photo choisie (lire un QR code depuis une image)
    private static final int REQ_CAM = 7, REQ_FILE = 8;

    /** Pont JavaScript : partage natif, presse-papiers (window.AndroidApp dans le jeu). */
    public class Bridge {
        @JavascriptInterface public void share(String text) {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_TEXT, text);
                startActivity(Intent.createChooser(i, "Partager le niveau"));
            });
        }
        @JavascriptInterface public void copy(String text) {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Virus Défense", text));
        }
        @JavascriptInterface public String paste() {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm == null || !cm.hasPrimaryClip() || cm.getPrimaryClip().getItemCount() == 0) return "";
            CharSequence t = cm.getPrimaryClip().getItemAt(0).coerceToText(MainActivity.this);
            return t == null ? "" : t.toString();
        }
    }

    /** Niveau reçu : message partagé vers l'appli (WhatsApp, SMS…) ou lien #lvl=… */
    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String t = null;
        if (Intent.ACTION_SEND.equals(intent.getAction())) t = intent.getStringExtra(Intent.EXTRA_TEXT);
        else if (Intent.ACTION_VIEW.equals(intent.getAction())) { Uri u = intent.getData(); if (u != null) t = u.toString(); }
        if (t == null || !t.contains("VD")) return;
        pendingLevel = t;
        deliverLevel();
    }
    private void deliverLevel() {
        if (!pageReady || pendingLevel == null) return;
        String js = "window.onSharedLevel && window.onSharedLevel(" + JSONObject.quote(pendingLevel) + ")";
        pendingLevel = null;
        web.evaluateJavascript(js, null);
    }

    @Override
    protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); handleIntent(intent); }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }

        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // sauvegarde de la progression (localStorage)
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView v, String url) { pageReady = true; deliverLevel(); }
        });
        web.addJavascriptInterface(new Bridge(), "AndroidApp");
        web.setWebChromeClient(new WebChromeClient() {
            /** Le jeu demande la caméra pour scanner un QR code : on demande l'autorisation Android si besoin. */
            @Override public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean cam = false;
                    for (String r : request.getResources()) if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) cam = true;
                    if (!cam) { request.deny(); return; }
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
                    } else {
                        pendingPerm = request;
                        requestPermissions(new String[] { Manifest.permission.CAMERA }, REQ_CAM);
                    }
                });
            }
            /** Choix d'une photo (bouton « Depuis une photo »). */
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                try { startActivityForResult(params.createIntent(), REQ_FILE); }
                catch (Exception e) { fileCb = null; return false; }
                return true;
            }
        });
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(web);
        hideSystemBars();

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl("file:///android_asset/www/index.html");
        handleIntent(getIntent());
    }

    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    /** Bouton retour : pause / retour au menu dans le jeu, sinon quitte l'appli. */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript("(window.onAndroidBack && window.onAndroidBack()) ? 'yes' : 'no'", value -> {
            if (value == null || !value.contains("yes")) finish();
        });
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code == REQ_CAM && pendingPerm != null) {
            if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) pendingPerm.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
            else pendingPerm.deny();
            pendingPerm = null;
        }
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code == REQ_FILE && fileCb != null) {
            fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            fileCb = null;
        }
    }

    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); hideSystemBars(); }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
