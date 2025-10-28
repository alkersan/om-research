import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.dji.sdk.sample"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.dji.sdk.sample"
        minSdk = 31
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        ndk {
            abiFilters.add("armeabi-v7a")
            abiFilters.add("arm64-v8a")
        }
    }
    useLibrary("org.apache.http.legacy")

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = false
            proguardFiles(getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro")
        }
    }

    packaging {
        jniLibs.keepDebugSymbols.add("**/libdjivideo.so")
        jniLibs.keepDebugSymbols.add("**/libSDKRelativeJNI.so")
        jniLibs.keepDebugSymbols.add("**/libFlyForbid.so")
        jniLibs.keepDebugSymbols.add("**/libduml_vision_bokeh.so")
        jniLibs.keepDebugSymbols.add("**/libyuv2.so")
        jniLibs.keepDebugSymbols.add("**/libGroudStation.so")
        jniLibs.keepDebugSymbols.add("**/libFRCorkscrew.so")
        jniLibs.keepDebugSymbols.add("**/libUpgradeVerify.so")
        jniLibs.keepDebugSymbols.add("**/libFR.so")
        jniLibs.keepDebugSymbols.add("**/libDJIFlySafeCore.so")
        jniLibs.keepDebugSymbols.add("**/libdjifs_jni.so")
        jniLibs.keepDebugSymbols.add("**/libsfjni.so")
        jniLibs.keepDebugSymbols.add("**/libDJICommonJNI.so")
        jniLibs.keepDebugSymbols.add("**/libDJICSDKCommon.so")
        jniLibs.keepDebugSymbols.add("**/libDJIUpgradeCore.so")
        jniLibs.keepDebugSymbols.add("**/libDJIUpgradeJNI.so")
        jniLibs.keepDebugSymbols.add("**/libDJIWaypointV2Core.so")
        jniLibs.keepDebugSymbols.add("**/libAMapSDK_MAP_v6_9_2.so")
        jniLibs.keepDebugSymbols.add("**/libDJIMOP.so")
        jniLibs.keepDebugSymbols.add("**/libDJISDKLOGJNI.so")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_11
    }
}

dependencies {
    implementation("com.dji:dji-sdk:4.18") {
        exclude(module = "library-anti-distortion")
        exclude(module = "fly-safe-database")
    }
    compileOnly("com.dji:dji-sdk-provided:4.18")
    implementation("androidx.multidex:multidex:2.0.1")

    implementation("androidx.core:core:1.17.0")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.activity:activity:1.11.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.constraintlayout:constraintlayout:2.2.1")
    implementation("androidx.lifecycle:lifecycle-process:2.9.4")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.4")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.2")
}
