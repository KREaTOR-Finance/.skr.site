import org.gradle.api.GradleException
import org.gradle.api.Project

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

fun quoteForBuildConfig(value: String): String =
    "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

fun Project.readConfig(name: String): String? =
    (findProperty(name) as String?)?.takeIf { it.isNotBlank() } ?: System.getenv(name)?.takeIf { it.isNotBlank() }

android {
    namespace = "com.skrstudio.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.skrstudio.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
        multiDexEnabled = true

        val storageProvider = project.readConfig("STORAGE_PROVIDER") ?: "arweave"
        val uploadApiBaseUrl = project.readConfig("UPLOAD_API_BASE_URL") ?: "http://10.0.2.2:3000"
        val arweaveJwk = project.readConfig("ARWEAVE_JWK") ?: ""
        val pinataJwt = project.readConfig("PINATA_JWT") ?: ""
        val chainNetwork = project.readConfig("CHAIN_NETWORK") ?: "mainnet"
        val rpcUrls = project.readConfig("SOLANA_RPC_URLS") ?: "https://api.mainnet-beta.solana.com,https://solana-mainnet.g.alchemy.com/v2/demo"

        buildConfigField("String", "STORAGE_PROVIDER", quoteForBuildConfig(storageProvider))
        buildConfigField("String", "UPLOAD_API_BASE_URL", quoteForBuildConfig(uploadApiBaseUrl))
        buildConfigField("String", "ARWEAVE_JWK", quoteForBuildConfig(arweaveJwk))
        buildConfigField("String", "PINATA_JWT", quoteForBuildConfig(pinataJwt))
        buildConfigField("String", "CHAIN_NETWORK", quoteForBuildConfig(chainNetwork))
        buildConfigField("String", "SOLANA_RPC_URLS", quoteForBuildConfig(rpcUrls))
        buildConfigField("boolean", "ENABLE_DEVNET_TOGGLE", "false")
    }

    val releaseStoreFile = project.readConfig("RELEASE_STORE_FILE")
    val releaseStorePassword = project.readConfig("RELEASE_STORE_PASSWORD")
    val releaseKeyAlias = project.readConfig("RELEASE_KEY_ALIAS")
    val releaseKeyPassword = project.readConfig("RELEASE_KEY_PASSWORD")
    val hasReleaseSigning = listOf(releaseStoreFile, releaseStorePassword, releaseKeyAlias, releaseKeyPassword).all { !it.isNullOrBlank() }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(releaseStoreFile!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        debug {
            buildConfigField("boolean", "ENABLE_DEVNET_TOGGLE", "true")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            buildConfigField("boolean", "ENABLE_DEVNET_TOGGLE", "false")
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging { resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" } }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("androidx.activity:activity-compose:1.9.1")
    implementation(platform("androidx.compose:compose-bom:2024.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.7.7")
    implementation("androidx.multidex:multidex:2.0.1")
    implementation("com.google.android.material:material:1.12.0")

    implementation("com.solanamobile:mobile-wallet-adapter-clientlib-ktx:2.0.3")
    implementation("com.solanamobile:mobile-wallet-adapter-common:2.0.3")
    implementation("com.solanamobile:web3-solana-jvm:0.3.0-beta4")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    testImplementation("junit:junit:4.13.2")
}

tasks.register("validateReleaseSigning") {
    doLast {
        val required = listOf("RELEASE_STORE_FILE", "RELEASE_STORE_PASSWORD", "RELEASE_KEY_ALIAS", "RELEASE_KEY_PASSWORD")
        val missing = required.filter { project.readConfig(it).isNullOrBlank() }
        if (missing.isNotEmpty()) {
            throw GradleException(
                "Missing release signing configuration: ${missing.joinToString(", ")}. " +
                    "Set them in gradle.properties/local.properties or environment variables.",
            )
        }
    }
}

tasks.matching { it.name in setOf("assembleRelease", "bundleRelease") }.configureEach {
    dependsOn("validateReleaseSigning")
}
