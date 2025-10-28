package com.dji.sdk.sample

import android.app.Application
import android.content.Context

class Application : Application() {
    override fun attachBaseContext(base: Context?) {
        super.attachBaseContext(base)
        com.cySdkyc.clx.Helper.install(this)
    }
}
