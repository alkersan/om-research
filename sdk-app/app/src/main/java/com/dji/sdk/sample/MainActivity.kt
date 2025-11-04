package com.dji.sdk.sample

import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import dji.common.error.DJIError
import dji.common.error.DJISDKError
import dji.common.gimbal.Rotation
import dji.common.gimbal.RotationMode
import dji.sdk.base.BaseComponent
import dji.sdk.base.BaseProduct
import dji.sdk.sdkmanager.BluetoothDevice
import dji.sdk.sdkmanager.DJISDKInitEvent
import dji.sdk.sdkmanager.DJISDKManager
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

class MainActivity : AppCompatActivity() {
    private val TAG: String = MainActivity::class.java.simpleName

    private val ready = CompletableDeferred<Unit>()

    suspend fun registerSDK(): Unit = suspendCoroutine { cont ->
        DJISDKManager.getInstance()
            .registerApp(this.applicationContext, object : DJISDKManager.SDKManagerCallback {
                override fun onRegister(e: DJIError?) {
                    if (e == DJISDKError.REGISTRATION_SUCCESS) {
                        Log.i(TAG, "DJI SDK registered")
                        cont.resumeWith(Result.success(Unit))
                    } else {
                        Log.i(TAG, "DJI SDK error: $e")
                        cont.resumeWith(Result.failure(Exception(e?.description)))
                    }
                }

                override fun onInitProcess(p0: DJISDKInitEvent?, p1: Int) {}
                override fun onDatabaseDownloadProgress(p0: Long, p1: Long) {}
                override fun onProductDisconnect() {
                    Log.i(TAG, "Product disconnected")
                }

                override fun onProductConnect(p: BaseProduct?) {
                    Log.i(TAG, "Product connected: $p")
                    ready.complete(Unit)
                }

                override fun onProductChanged(p: BaseProduct?) {
                    Log.i(TAG, "Product changed: $p")
                }

                override fun onComponentChange(
                    p: BaseProduct.ComponentKey?,
                    p1: BaseComponent?,
                    p2: BaseComponent?
                ) {
                    Log.i(TAG, "Component changed: $p")
                }
            })
    }

    suspend fun scan(): BluetoothDevice = suspendCoroutine { cont ->
        val ble = DJISDKManager.getInstance().bluetoothProductConnector
        ble.setBluetoothDevicesListCallback { devices ->
            if (devices.isEmpty()) {
                return@setBluetoothDevicesListCallback
            }
            Log.i(TAG, "Found devices: $devices")
            ble.stopSearchBluetoothProducts { }
            cont.resume(devices[0])
        }
        Log.i(TAG, "Scanning bluetooth")
        ble.searchBluetoothProducts { e ->
            if (e != null) {
                Log.w(TAG, "Scan error: ${e.description}")
                cont.resumeWithException(Exception(e.description))
            }
        }
    }

    suspend fun connect(device: BluetoothDevice): Unit = suspendCoroutine { cont ->
        Log.i(TAG, "Connecting device $device")
        val ble = DJISDKManager.getInstance().bluetoothProductConnector
        ble.connect(device) { e ->
            if (e != null) {
                Log.i(TAG, "Connection failed ${e.description}")
                cont.resumeWithException(Exception(e.description))
            } else {
                Log.i(TAG, "Connected")
                cont.resume(Unit)
            }
        }
    }

    suspend fun <T> retry(max: Int = 10, block: suspend () -> T): T {
        var attempt = 1
        var last: Throwable? = null
        while (attempt <= max) {
            try {
                return block()
            } catch (t: Throwable) {
                last = t
                if (attempt == max) break
            }
            delay(5000)
            attempt++
        }
        throw last ?: IllegalStateException("Retry failed without exception")
    }

    suspend fun rotate(
        timeMillis: Int = 500,
        yaw: Float? = null,
        pitch: Float? = null,
        roll: Float? = null,
    ): Unit = suspendCoroutine { cont ->
        val rotation = Rotation.Builder()
            .mode(RotationMode.ABSOLUTE_ANGLE)
            .yaw(yaw ?: Rotation.NO_ROTATION)
            .pitch(pitch ?: Rotation.NO_ROTATION)
            .roll(roll ?: Rotation.NO_ROTATION)
            .time(timeMillis / 1000.0)
            .build()

        val gimbal = DJISDKManager.getInstance().product.gimbal
        Log.i(TAG, "Rotating to: ${rotation.yaw}")
        gimbal.rotate(rotation) { e ->
            if (e == null) {
                cont.resume(Unit)
            } else {
                Log.i(TAG, "Rotation error: $e")
                cont.resumeWithException(Exception(e.description))
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        Log.i(TAG, "DJI SDK Version: ${DJISDKManager.getInstance().sdkVersion}")
        lifecycleScope.launch {
            registerSDK()
            val device = retry {
                scan()
            }
            connect(device)
            ready.await()

            delay(7000)
            var yaw = 45.0f
            while (true) {
                rotate(1500, yaw = yaw, pitch = 0f)
                yaw = -yaw
                delay(10000)
            }
        }
    }
}
