/**
 * AllNew Apps - Shared App Data for Legal Pages
 * Used by common legal pages (privacy, terms, tokusho, faq, legal-notice)
 * URL parameter: ?app=weightsnap
 */
const APP_DATA = {
    weightsnap: {
        name: "WeightSnap",
        supportEmail: "weightsnap-support@allnew.work",
        icon: "&#x2696;&#xFE0F;",
        ja: {
            subtitle: "体重記録アプリ",
            description: "体重計の表示をカメラで撮影し、画像認識（OCR）により体重値を推定し、Apple HealthKit（ヘルスケア）に記録するアプリ",
            dataTypes: "体重データ",
            healthKitWrite: "体重データの書き込み",
            healthKitRead: "体重データの読み取り（前回比表示、推移グラフ等）",
            cameraUsage: "体重計表示の読み取り（OCR）のために撮影画像を一時的に使用",
            importantNote: "本アプリは、体重データおよび撮影画像を当社の外部サーバーに送信・保存しません。体重データは端末内およびApple HealthKitに保存されます。撮影画像はOCR処理後に即時破棄されます。HealthKitの保存・同期（iCloud等）の挙動は、ユーザーの端末設定およびAppleの仕様に従います。",
            appOverview: "体重計の表示をカメラで撮影し、画像認識（OCR）により体重値を推定し、ユーザーの許可および設定に基づき、Appleの「ヘルスケア（Apple Health）」に体重データを書き込む機能を提供します。",
            appOverview2: "ユーザーが任意に許可した場合に限り、ヘルスケア上の体重データを読み取り、前回の体重との増減表示、体重推移のグラフ表示等に利用します。",
            supportedDevices: "<strong>対応体重計:</strong> デジタル表示（7セグメントLED、液晶ディスプレイ等）の体重計に対応しています。アナログ体重計（針式メーター、回転式ダイヤル等）には対応しておりません。",
            supportedRange: "<strong>対応体重範囲:</strong> 30.0kg〜200.0kgの範囲に対応しています。",
            supportedOS: "<strong>対応デバイス:</strong> iOS 17.0以降を搭載したiPhone。",
            freeTier: "本アプリはヘルスケアへの体重記録について無料で利用できる回数に上限（15回）を設けたうえで、追加利用のための買い切り（アプリ内課金）を提供する場合があります。",
            tokushoFreeTier: "本アプリはヘルスケアへの体重記録について無料で利用できる回数に上限（15回）があり、上限到達後は買い切りのアプリ内課金により利用制限が解除されます。無料回数、価格、条件の詳細はApp Store上の表示に従います。",
            healthCategory: "「ブラウズ」→「体の測定値」→「体重」",
            notMedicalDevice: "本アプリは医療機器ではなく、診断・治療・予防等の医療行為を目的としません。本アプリの表示・メッセージ等は一般的な情報提供であり、医療上の判断は医師等の専門家にご相談ください。",
            faq: [
                { q: "どんな体重計に対応していますか？", a: "<p>デジタル表示の体重計に対応しています。</p><ul><li><strong>対応:</strong> 7セグメントLED、液晶ディスプレイなどのデジタル表示</li><li><strong>非対応:</strong> アナログ体重計（針式メーター、回転式ダイヤル）</li></ul>" },
                { q: "認識できる体重の範囲は？", a: "<p><strong>30.0kg〜200.0kg</strong>の範囲に対応しています。この範囲外の数値は認識されません。</p>" },
                { q: "対応しているiPhoneは？", a: "<p><strong>iOS 17.0以降</strong>を搭載し、カメラ機能およびApple HealthKitに対応したiPhoneで動作します。</p>" },
                { q: "無料で使えますか？", a: "<p><strong>15回まで無料</strong>でお使いいただけます。16回目以降は一回限りの買い切り購入が必要です。</p><p>サブスクリプション（月額・年額課金）はありません。一度購入すれば、ずっとお使いいただけます。</p>" },
                { q: "データはどこに保存されますか？", a: "<p>体重データは<strong>お使いのデバイス内のApple HealthKit（ヘルスケア）</strong>に保存されます。</p><p>当社が運用するサーバーへの送信はありません。撮影した画像もOCR処理後に即時破棄されます。HealthKitの保存・同期（iCloud等）の挙動は、ユーザーの端末設定およびAppleの仕様に従います。</p>" },
                { q: "認識精度が低い場合はどうなりますか？", a: "<p>アプリが認識結果の精度（信頼度）を自動判定します。</p><ul><li><strong>高信頼度の場合:</strong> 確認画面なしで自動的にヘルスケアに記録されます</li><li><strong>低信頼度の場合:</strong> 認識した値を確認画面で表示します<ul><li>「この値で記録する」→ ヘルスケアに保存されます</li><li>「記録しない」→ 保存せず、再度撮影・認識を行います</li></ul></li></ul><p>低信頼度と判定された場合、ユーザーが明示的に許可しない限り記録されることはありません。</p>" },
                { q: "認識結果が間違っていた場合は？", a: "<p><strong>保存前の場合:</strong> 認識精度が低い場合は、アプリが確認画面を表示します。正しくないと思ったら「記録しない」を選択し、再度撮影してください。</p><p><strong>保存後の場合:</strong> 高信頼度の認識結果は確認なしで自動保存されます。誤った数値が保存された場合は、iOSの<strong>ヘルスケアアプリから削除</strong>してください。</p><p><strong>削除手順:</strong></p><ul><li>ヘルスケアアプリを開く</li><li>「ブラウズ」→「体の測定値」→「体重」を選択</li><li>該当するデータを左にスワイプして「削除」</li></ul><p>※HealthKitの仕様上、保存されたデータの<strong>編集はできません</strong>。削除して、本アプリで再認識・再登録する必要があります。</p>" },
                { q: "アプリを削除するとデータは消えますか？", a: "<p>アプリを削除する際、iOSが<strong>「ヘルスケアデータを削除しますか？」</strong>と確認します。</p><ul><li>「削除」を選択 → ヘルスケアのデータも削除されます</li><li>「削除しない」を選択 → データはヘルスケアアプリに保持されます</li></ul><p>データを完全に削除したい場合は、削除確認で「削除」を選択するか、事前にヘルスケアアプリから手動で削除してください。</p>" },
                { q: "購入を復元したい", a: "<p>過去に購入された方は、再購入の必要はありません。</p><p><strong>復元手順:</strong> アプリを開き「設定」→「アプリについて」→「購入を復元」をタップしてください。</p>" },
                { q: "認識精度を上げるコツは？", a: "<ul><li>体重計のディスプレイが明るく表示されている状態で撮影</li><li>ガイド枠内に数字が収まるように位置を調整</li><li>手ブレを避け、できるだけ静止した状態で撮影</li><li>ディスプレイの汚れや劣化がないか確認</li><li>直射日光や強い照明の反射を避ける</li></ul>" }
            ]
        },
        en: {
            subtitle: "Weight Recording App",
            description: "Captures a photo of your scale display, uses OCR to estimate a weight value, and writes weight data to Apple HealthKit",
            dataTypes: "weight data",
            healthKitWrite: "writing weight data",
            healthKitRead: "reading weight data (to show changes and trends)",
            cameraUsage: "uses captured images temporarily for OCR to read scale displays",
            importantNote: "This app does not send or store your weight data or captured images on our external servers. Weight data is stored on your device and in Apple HealthKit. Captured images are discarded immediately after OCR processing. Health data storage/sync behavior (including iCloud) depends on your device settings and Apple's system behavior.",
            appOverview: "The App captures a photo of your scale display, uses OCR to estimate a weight value, and—based on your permissions and settings—writes weight data to the Apple Health app (via HealthKit).",
            appOverview2: "If you optionally grant read access, the App may also read your weight data from the Apple Health app to show changes since your previous measurement and to display trends (e.g., charts/graphs).",
            supportedDevices: "<strong>Supported Scales:</strong> Digital displays (7-segment LED, LCD). Analog scales are not supported.",
            supportedRange: "<strong>Weight Range:</strong> 30.0kg–200.0kg (66–440 lbs)",
            supportedOS: "<strong>Supported Devices:</strong> iPhone with iOS 17.0 or later",
            freeTier: "The App may offer a limited number of free weight recordings to Apple HealthKit (up to 15 recordings) and then provide a one-time in-app purchase to unlock unlimited usage.",
            tokushoFreeTier: "The App offers up to 15 free weight recordings to Apple HealthKit, after which a one-time in-app purchase unlocks unlimited use. Details follow the App Store listing.",
            healthCategory: "Browse → Body Measurements → Weight",
            notMedicalDevice: "The App is not a medical device and does not provide medical advice, diagnosis, or treatment.",
            faq: [
                { q: "What scales are supported?", a: "<p>Digital display scales are supported.</p><ul><li><strong>Supported:</strong> 7-segment LED, LCD displays</li><li><strong>Not Supported:</strong> Analog scales (needle meters, rotating dials)</li></ul>" },
                { q: "What weight range is recognized?", a: "<p><strong>30.0kg–200.0kg</strong> (approximately 66–440 lbs). Values outside this range won't be recognized.</p>" },
                { q: "Which iPhones are supported?", a: "<p>iPhones running <strong>iOS 17.0 or later</strong> with camera and Apple HealthKit support.</p>" },
                { q: "Is it free?", a: "<p><strong>Free for the first 15 uses.</strong> After that, a one-time purchase is required.</p><p>No subscription fees. Pay once, use forever.</p>" },
                { q: "Where is my data stored?", a: "<p>Weight data is stored in <strong>Apple HealthKit on your device</strong>.</p><p>We do not transmit data to servers operated by us. Camera images are discarded immediately after OCR processing. How Health data may be stored or synced (including via iCloud) depends on your device settings and Apple's system behavior.</p>" },
                { q: "What happens when recognition confidence is low?", a: "<p>The app automatically evaluates recognition confidence.</p><ul><li><strong>High confidence:</strong> Automatically saved to HealthKit without confirmation</li><li><strong>Low confidence:</strong> A confirmation screen is shown with the detected value<ul><li>\"Record this value\" → Saves to HealthKit</li><li>\"Don't Record\" → Does not save, prompts you to retake and retry</li></ul></li></ul><p>When the app determines confidence is low, data will not be saved unless you explicitly approve it.</p>" },
                { q: "What if the recognition is wrong?", a: "<p><strong>Before saving:</strong> If the recognition confidence is low, the app will show a confirmation screen. If the value looks incorrect, choose \"Don't Record\" and retake the photo.</p><p><strong>After saving:</strong> High-confidence readings are automatically saved without confirmation. If incorrect data was saved, <strong>delete it from the iOS Health app</strong>.</p><p><strong>How to delete:</strong></p><ul><li>Open the Health app</li><li>Go to Browse → Body Measurements → Weight</li><li>Swipe left on the incorrect entry and tap \"Delete\"</li></ul><p>Note: HealthKit data <strong>cannot be edited</strong>, only deleted. You must delete and re-scan with the App to correct a value.</p>" },
                { q: "What happens to my data if I delete the app?", a: "<p>When you delete the app, iOS will ask: <strong>\"Delete health data?\"</strong></p><ul><li>Choose \"Delete\" → Health data is also deleted</li><li>Choose \"Keep\" → Data remains in the Health app</li></ul><p>To completely delete all data, select \"Delete\" or manually remove it from the Health app beforehand.</p>" },
                { q: "How do I restore my purchase?", a: "<p>If you've previously purchased, you don't need to buy again.</p><p><strong>To restore:</strong> Open the app → Settings → About → Restore Purchase</p>" },
                { q: "Tips for better recognition", a: "<ul><li>Ensure the scale display is brightly lit</li><li>Position numbers within the guide frame</li><li>Hold the phone steady to avoid blur</li><li>Clean any dirt or smudges from the display</li><li>Avoid direct sunlight or strong reflections</li></ul>" }
            ]
        }
    },
    bpsnap: {
        name: "BPSnap",
        supportEmail: "bpsnap-support@allnew.work",
        icon: "&#x1FA7A;",
        ja: {
            subtitle: "血圧記録アプリ",
            description: "血圧計の表示をカメラや音声で読み取り、Apple HealthKit（ヘルスケア）に記録するアプリ",
            dataTypes: "血圧データ（収縮期・拡張期）",
            healthKitWrite: "血圧データの書き込み",
            healthKitRead: "血圧データの読み取り（前回比表示、推移グラフ等）",
            cameraUsage: "血圧計表示の読み取り（OCR）のために撮影画像を一時的に使用",
            importantNote: "本アプリは、血圧データおよび撮影画像を当社の外部サーバーに送信・保存しません。血圧データは端末内およびApple HealthKitに保存されます。撮影画像はOCR処理後に即時破棄されます。HealthKitの保存・同期（iCloud等）の挙動は、ユーザーの端末設定およびAppleの仕様に従います。",
            appOverview: "血圧計の表示をカメラで撮影し、画像認識（OCR）または音声認識により血圧値（収縮期・拡張期）を読み取り、ユーザーの許可および設定に基づき、Appleの「ヘルスケア（Apple Health）」に血圧データを書き込む機能を提供します。",
            appOverview2: "ユーザーが任意に許可した場合に限り、ヘルスケア上の血圧データを読み取り、前回の血圧との増減表示、血圧推移のグラフ表示等に利用します。",
            supportedDevices: "<strong>対応血圧計:</strong> デジタル表示の血圧計に対応しています。",
            supportedRange: "<strong>対応血圧範囲:</strong> 収縮期・拡張期の標準的な範囲に対応しています。",
            supportedOS: "<strong>対応デバイス:</strong> iOS 17.0以降を搭載したiPhone。",
            freeTier: "本アプリはヘルスケアへの血圧記録について無料で利用できる回数に上限（15回）を設けたうえで、追加利用のための買い切り（アプリ内課金）を提供する場合があります。",
            tokushoFreeTier: "本アプリはヘルスケアへの血圧記録について無料で利用できる回数に上限（15回）があり、上限到達後は買い切りのアプリ内課金により利用制限が解除されます。無料回数、価格、条件の詳細はApp Store上の表示に従います。",
            healthCategory: "「ブラウズ」→「心臓」→「血圧」",
            notMedicalDevice: "本アプリは医療機器ではなく、診断・治療・予防等の医療行為を目的としません。本アプリの表示・メッセージ等は一般的な情報提供であり、医療上の判断は医師等の専門家にご相談ください。",
            faq: [
                { q: "無料で使えますか？", a: "<p><strong>15回まで無料</strong>でお使いいただけます。16回目以降は一回限りの買い切り購入が必要です。</p><p>サブスクリプション（月額・年額課金）はありません。一度購入すれば、ずっとお使いいただけます。</p>" },
                { q: "データはどこに保存されますか？", a: "<p>血圧データは<strong>お使いのデバイス内のApple HealthKit（ヘルスケア）</strong>に保存されます。</p><p>当社が運用するサーバーへの送信はありません。撮影した画像もOCR処理後に即時破棄されます。</p>" },
                { q: "購入を復元したい", a: "<p>過去に購入された方は、再購入の必要はありません。</p><p><strong>復元手順:</strong> アプリを開き「設定」→「アプリについて」→「購入を復元」をタップしてください。</p>" }
            ]
        },
        en: {
            subtitle: "Blood Pressure Recording App",
            description: "Reads blood pressure monitor displays via camera or voice, and records data to Apple HealthKit",
            dataTypes: "blood pressure data (systolic/diastolic)",
            healthKitWrite: "writing blood pressure data",
            healthKitRead: "reading blood pressure data (to show changes and trends)",
            cameraUsage: "uses captured images temporarily for OCR to read blood pressure monitor displays",
            importantNote: "This app does not send or store your blood pressure data or captured images on our external servers. Blood pressure data is stored on your device and in Apple HealthKit. Captured images are discarded immediately after OCR processing.",
            appOverview: "The App reads blood pressure monitor displays via camera (OCR) or voice recognition to capture systolic and diastolic values, and—based on your permissions and settings—writes blood pressure data to the Apple Health app (via HealthKit).",
            appOverview2: "If you optionally grant read access, the App may also read your blood pressure data from the Apple Health app to show changes and trends.",
            supportedDevices: "<strong>Supported Devices:</strong> Digital blood pressure monitors.",
            supportedRange: "<strong>Supported Range:</strong> Standard systolic and diastolic ranges.",
            supportedOS: "<strong>Supported Devices:</strong> iPhone with iOS 17.0 or later",
            freeTier: "The App may offer a limited number of free blood pressure recordings (up to 15) and then provide a one-time in-app purchase to unlock unlimited usage.",
            tokushoFreeTier: "The App offers up to 15 free recordings, after which a one-time in-app purchase unlocks unlimited use.",
            healthCategory: "Browse → Heart → Blood Pressure",
            notMedicalDevice: "The App is not a medical device and does not provide medical advice, diagnosis, or treatment.",
            faq: [
                { q: "Is it free?", a: "<p><strong>Free for the first 15 uses.</strong> After that, a one-time purchase is required.</p><p>No subscription fees. Pay once, use forever.</p>" },
                { q: "Where is my data stored?", a: "<p>Blood pressure data is stored in <strong>Apple HealthKit on your device</strong>.</p><p>We do not transmit data to servers operated by us.</p>" },
                { q: "How do I restore my purchase?", a: "<p>If you've previously purchased, you don't need to buy again.</p><p><strong>To restore:</strong> Open the app → Settings → About → Restore Purchase</p>" }
            ]
        }
    },
    glucosnap: {
        name: "GlucoSnap",
        supportEmail: "glucosnap-support@allnew.work",
        icon: "&#x1FA78;",
        ja: {
            subtitle: "血糖値記録アプリ",
            description: "血糖値計の表示をカメラや音声で読み取り、Apple HealthKit（ヘルスケア）に記録するアプリ",
            dataTypes: "血糖値データ",
            healthKitWrite: "血糖値データの書き込み",
            healthKitRead: "血糖値データの読み取り（前回比表示、推移グラフ等）",
            cameraUsage: "血糖値計表示の読み取り（OCR）のために撮影画像を一時的に使用",
            importantNote: "本アプリは、血糖値データおよび撮影画像を当社の外部サーバーに送信・保存しません。血糖値データは端末内およびApple HealthKitに保存されます。撮影画像はOCR処理後に即時破棄されます。",
            appOverview: "血糖値計の表示をカメラで撮影し、画像認識（OCR）または音声認識により血糖値を読み取り、ユーザーの許可および設定に基づき、Appleの「ヘルスケア（Apple Health）」に血糖値データを書き込む機能を提供します。",
            appOverview2: "ユーザーが任意に許可した場合に限り、ヘルスケア上の血糖値データを読み取り、前回の血糖値との増減表示、推移のグラフ表示等に利用します。",
            supportedDevices: "<strong>対応機器:</strong> デジタル表示の血糖値計に対応しています。",
            supportedRange: "<strong>対応範囲:</strong> 標準的な血糖値範囲に対応しています。",
            supportedOS: "<strong>対応デバイス:</strong> iOS 17.0以降を搭載したiPhone。",
            freeTier: "本アプリはヘルスケアへの血糖値記録について無料で利用できる回数に上限（15回）を設けたうえで、追加利用のための買い切り（アプリ内課金）を提供する場合があります。",
            tokushoFreeTier: "本アプリはヘルスケアへの血糖値記録について無料で利用できる回数に上限（15回）があり、上限到達後は買い切りのアプリ内課金により利用制限が解除されます。無料回数、価格、条件の詳細はApp Store上の表示に従います。",
            healthCategory: "「ブラウズ」→「その他のデータ」→「血糖値」",
            notMedicalDevice: "本アプリは医療機器ではなく、診断・治療・予防等の医療行為を目的としません。",
            faq: [
                { q: "無料で使えますか？", a: "<p><strong>15回まで無料</strong>でお使いいただけます。16回目以降は一回限りの買い切り購入が必要です。</p><p>サブスクリプション（月額・年額課金）はありません。</p>" },
                { q: "データはどこに保存されますか？", a: "<p>血糖値データは<strong>お使いのデバイス内のApple HealthKit（ヘルスケア）</strong>に保存されます。</p>" },
                { q: "購入を復元したい", a: "<p>過去に購入された方は、再購入の必要はありません。</p><p><strong>復元手順:</strong> アプリを開き「設定」→「アプリについて」→「購入を復元」をタップしてください。</p>" }
            ]
        },
        en: {
            subtitle: "Blood Glucose Recording App",
            description: "Reads glucose meter displays via camera or voice, and records data to Apple HealthKit",
            dataTypes: "blood glucose data",
            healthKitWrite: "writing blood glucose data",
            healthKitRead: "reading blood glucose data (to show changes and trends)",
            cameraUsage: "uses captured images temporarily for OCR to read glucose meter displays",
            importantNote: "This app does not send or store your blood glucose data or captured images on our external servers.",
            appOverview: "The App reads glucose meter displays via camera (OCR) or voice recognition, and writes blood glucose data to Apple HealthKit.",
            appOverview2: "If you optionally grant read access, the App may also read your blood glucose data to show changes and trends.",
            supportedDevices: "<strong>Supported Devices:</strong> Digital glucose meters.",
            supportedRange: "<strong>Supported Range:</strong> Standard blood glucose ranges.",
            supportedOS: "<strong>Supported Devices:</strong> iPhone with iOS 17.0 or later",
            freeTier: "The App may offer up to 15 free recordings and then provide a one-time in-app purchase.",
            tokushoFreeTier: "The App offers up to 15 free recordings, after which a one-time in-app purchase unlocks unlimited use.",
            healthCategory: "Browse → Other Data → Blood Glucose",
            notMedicalDevice: "The App is not a medical device and does not provide medical advice, diagnosis, or treatment.",
            faq: [
                { q: "Is it free?", a: "<p><strong>Free for the first 15 uses.</strong> After that, a one-time purchase is required.</p>" },
                { q: "Where is my data stored?", a: "<p>Blood glucose data is stored in <strong>Apple HealthKit on your device</strong>.</p>" },
                { q: "How do I restore my purchase?", a: "<p><strong>To restore:</strong> Open the app → Settings → About → Restore Purchase</p>" }
            ]
        }
    },
    oxisnap: {
        name: "OxiSnap",
        supportEmail: "oxisnap-support@allnew.work",
        icon: "&#x1F9EC;",
        ja: {
            subtitle: "SpO2記録アプリ",
            description: "パルスオキシメーターの表示をカメラや音声で読み取り、Apple HealthKit（ヘルスケア）に記録するアプリ",
            dataTypes: "SpO2（酸素飽和度）データ",
            healthKitWrite: "SpO2データの書き込み",
            healthKitRead: "SpO2データの読み取り（前回比表示、推移グラフ等）",
            cameraUsage: "パルスオキシメーター表示の読み取り（OCR）のために撮影画像を一時的に使用",
            importantNote: "本アプリは、SpO2データおよび撮影画像を当社の外部サーバーに送信・保存しません。SpO2データは端末内およびApple HealthKitに保存されます。",
            appOverview: "パルスオキシメーターの表示をカメラで撮影し、画像認識（OCR）または音声認識によりSpO2値を読み取り、Apple HealthKitに記録する機能を提供します。",
            appOverview2: "ユーザーが任意に許可した場合に限り、ヘルスケア上のSpO2データを読み取り、推移表示等に利用します。",
            supportedDevices: "<strong>対応機器:</strong> デジタル表示のパルスオキシメーターに対応しています。",
            supportedRange: "<strong>対応範囲:</strong> 標準的なSpO2範囲に対応しています。",
            supportedOS: "<strong>対応デバイス:</strong> iOS 17.0以降を搭載したiPhone。",
            freeTier: "本アプリはヘルスケアへのSpO2記録について無料で利用できる回数に上限（15回）を設けたうえで、追加利用のための買い切り（アプリ内課金）を提供する場合があります。",
            tokushoFreeTier: "本アプリはヘルスケアへのSpO2記録について無料で利用できる回数に上限（15回）があり、上限到達後は買い切りのアプリ内課金により利用制限が解除されます。",
            healthCategory: "「ブラウズ」→「呼吸」→「血中酸素ウェルネス」",
            notMedicalDevice: "本アプリは医療機器ではなく、診断・治療・予防等の医療行為を目的としません。",
            faq: [
                { q: "無料で使えますか？", a: "<p><strong>15回まで無料</strong>でお使いいただけます。16回目以降は一回限りの買い切り購入が必要です。</p>" },
                { q: "データはどこに保存されますか？", a: "<p>SpO2データは<strong>お使いのデバイス内のApple HealthKit（ヘルスケア）</strong>に保存されます。</p>" },
                { q: "購入を復元したい", a: "<p><strong>復元手順:</strong> アプリを開き「設定」→「アプリについて」→「購入を復元」をタップしてください。</p>" }
            ]
        },
        en: {
            subtitle: "SpO2 Recording App",
            description: "Reads pulse oximeter displays via camera or voice, and records data to Apple HealthKit",
            dataTypes: "SpO2 (oxygen saturation) data",
            healthKitWrite: "writing SpO2 data",
            healthKitRead: "reading SpO2 data (to show changes and trends)",
            cameraUsage: "uses captured images temporarily for OCR to read pulse oximeter displays",
            importantNote: "This app does not send or store your SpO2 data or captured images on our external servers.",
            appOverview: "The App reads pulse oximeter displays via camera (OCR) or voice recognition, and writes SpO2 data to Apple HealthKit.",
            appOverview2: "If you optionally grant read access, the App may also read your SpO2 data to show changes and trends.",
            supportedDevices: "<strong>Supported Devices:</strong> Digital pulse oximeters.",
            supportedRange: "<strong>Supported Range:</strong> Standard SpO2 ranges.",
            supportedOS: "<strong>Supported Devices:</strong> iPhone with iOS 17.0 or later",
            freeTier: "The App may offer up to 15 free recordings and then provide a one-time in-app purchase.",
            tokushoFreeTier: "The App offers up to 15 free recordings, after which a one-time in-app purchase unlocks unlimited use.",
            healthCategory: "Browse → Respiratory → Blood Oxygen",
            notMedicalDevice: "The App is not a medical device and does not provide medical advice, diagnosis, or treatment.",
            faq: [
                { q: "Is it free?", a: "<p><strong>Free for the first 15 uses.</strong> After that, a one-time purchase is required.</p>" },
                { q: "Where is my data stored?", a: "<p>SpO2 data is stored in <strong>Apple HealthKit on your device</strong>.</p>" },
                { q: "How do I restore my purchase?", a: "<p><strong>To restore:</strong> Open the app → Settings → About → Restore Purchase</p>" }
            ]
        }
    },
    thermosnap: {
        name: "ThermoSnap",
        supportEmail: "thermosnap-support@allnew.work",
        icon: "&#x1F321;&#xFE0F;",
        ja: {
            subtitle: "体温記録アプリ",
            description: "体温計の表示をカメラや音声で読み取り、Apple HealthKit（ヘルスケア）に記録するアプリ",
            dataTypes: "体温データ",
            healthKitWrite: "体温データの書き込み",
            healthKitRead: "体温データの読み取り（前回比表示、推移グラフ等）",
            cameraUsage: "体温計表示の読み取り（OCR）のために撮影画像を一時的に使用",
            importantNote: "本アプリは、体温データおよび撮影画像を当社の外部サーバーに送信・保存しません。体温データは端末内およびApple HealthKitに保存されます。",
            appOverview: "体温計の表示をカメラで撮影し、画像認識（OCR）または音声認識により体温値を読み取り、Apple HealthKitに記録する機能を提供します。",
            appOverview2: "ユーザーが任意に許可した場合に限り、ヘルスケア上の体温データを読み取り、推移表示等に利用します。",
            supportedDevices: "<strong>対応機器:</strong> デジタル表示の体温計に対応しています。",
            supportedRange: "<strong>対応範囲:</strong> 標準的な体温範囲に対応しています。",
            supportedOS: "<strong>対応デバイス:</strong> iOS 17.0以降を搭載したiPhone。",
            freeTier: "本アプリはヘルスケアへの体温記録について無料で利用できる回数に上限（15回）を設けたうえで、追加利用のための買い切り（アプリ内課金）を提供する場合があります。",
            tokushoFreeTier: "本アプリはヘルスケアへの体温記録について無料で利用できる回数に上限（15回）があり、上限到達後は買い切りのアプリ内課金により利用制限が解除されます。",
            healthCategory: "「ブラウズ」→「体の測定値」→「体温」",
            notMedicalDevice: "本アプリは医療機器ではなく、診断・治療・予防等の医療行為を目的としません。",
            faq: [
                { q: "無料で使えますか？", a: "<p><strong>15回まで無料</strong>でお使いいただけます。</p>" },
                { q: "データはどこに保存されますか？", a: "<p>体温データは<strong>お使いのデバイス内のApple HealthKit（ヘルスケア）</strong>に保存されます。</p>" },
                { q: "購入を復元したい", a: "<p><strong>復元手順:</strong> アプリを開き「設定」→「アプリについて」→「購入を復元」をタップしてください。</p>" }
            ]
        },
        en: {
            subtitle: "Body Temperature Recording App",
            description: "Reads thermometer displays via camera or voice, and records data to Apple HealthKit",
            dataTypes: "body temperature data",
            healthKitWrite: "writing body temperature data",
            healthKitRead: "reading body temperature data (to show changes and trends)",
            cameraUsage: "uses captured images temporarily for OCR to read thermometer displays",
            importantNote: "This app does not send or store your body temperature data or captured images on our external servers.",
            appOverview: "The App reads thermometer displays via camera (OCR) or voice recognition, and writes body temperature data to Apple HealthKit.",
            appOverview2: "If you optionally grant read access, the App may also read your body temperature data to show changes and trends.",
            supportedDevices: "<strong>Supported Devices:</strong> Digital thermometers.",
            supportedRange: "<strong>Supported Range:</strong> Standard body temperature ranges.",
            supportedOS: "<strong>Supported Devices:</strong> iPhone with iOS 17.0 or later",
            freeTier: "The App may offer up to 15 free recordings and then provide a one-time in-app purchase.",
            tokushoFreeTier: "The App offers up to 15 free recordings, after which a one-time in-app purchase unlocks unlimited use.",
            healthCategory: "Browse → Body Measurements → Body Temperature",
            notMedicalDevice: "The App is not a medical device and does not provide medical advice, diagnosis, or treatment.",
            faq: [
                { q: "Is it free?", a: "<p><strong>Free for the first 15 uses.</strong> After that, a one-time purchase is required.</p>" },
                { q: "Where is my data stored?", a: "<p>Body temperature data is stored in <strong>Apple HealthKit on your device</strong>.</p>" },
                { q: "How do I restore my purchase?", a: "<p><strong>To restore:</strong> Open the app → Settings → About → Restore Purchase</p>" }
            ]
        }
    },
    waistvox: {
        name: "WaistVox",
        supportEmail: "waistvox-support@allnew.work",
        icon: "&#x1F4CF;",
        ja: {
            subtitle: "ウエスト記録アプリ",
            description: "音声入力でウエストサイズをApple HealthKit（ヘルスケア）に記録するアプリ",
            dataTypes: "ウエスト周囲径データ",
            healthKitWrite: "ウエスト周囲径データの書き込み",
            healthKitRead: "ウエスト周囲径データの読み取り（前回比表示、推移グラフ等）",
            cameraUsage: "本アプリはカメラを使用しません",
            importantNote: "本アプリは、ウエストデータを当社の外部サーバーに送信・保存しません。データは端末内およびApple HealthKitに保存されます。",
            appOverview: "音声入力によりウエストサイズの値を読み取り、Apple HealthKitに記録する機能を提供します。",
            appOverview2: "ユーザーが任意に許可した場合に限り、ヘルスケア上のウエストデータを読み取り、推移表示等に利用します。",
            supportedDevices: "<strong>入力方法:</strong> 音声入力。",
            supportedRange: "<strong>対応範囲:</strong> 標準的なウエストサイズ範囲に対応しています。",
            supportedOS: "<strong>対応デバイス:</strong> iOS 17.0以降を搭載したiPhone。",
            freeTier: "本アプリはヘルスケアへのウエスト記録について無料で利用できる回数に上限（15回）を設けたうえで、追加利用のための買い切り（アプリ内課金）を提供する場合があります。",
            tokushoFreeTier: "本アプリはヘルスケアへのウエスト記録について無料で利用できる回数に上限（15回）があり、上限到達後は買い切りのアプリ内課金により利用制限が解除されます。",
            healthCategory: "「ブラウズ」→「体の測定値」→「ウエスト周囲径」",
            notMedicalDevice: "本アプリは医療機器ではなく、診断・治療・予防等の医療行為を目的としません。",
            faq: [
                { q: "無料で使えますか？", a: "<p><strong>15回まで無料</strong>でお使いいただけます。</p>" },
                { q: "データはどこに保存されますか？", a: "<p>ウエストデータは<strong>お使いのデバイス内のApple HealthKit（ヘルスケア）</strong>に保存されます。</p>" },
                { q: "購入を復元したい", a: "<p><strong>復元手順:</strong> アプリを開き「設定」→「アプリについて」→「購入を復元」をタップしてください。</p>" }
            ]
        },
        en: {
            subtitle: "Waist Measurement Recording App",
            description: "Records waist circumference to Apple HealthKit via voice input",
            dataTypes: "waist circumference data",
            healthKitWrite: "writing waist circumference data",
            healthKitRead: "reading waist circumference data (to show changes and trends)",
            cameraUsage: "This app does not use the camera",
            importantNote: "This app does not send or store your waist data on our external servers. Data is stored on your device and in Apple HealthKit.",
            appOverview: "The App records waist circumference values via voice input and writes data to Apple HealthKit.",
            appOverview2: "If you optionally grant read access, the App may also read your waist data to show changes and trends.",
            supportedDevices: "<strong>Input Method:</strong> Voice input.",
            supportedRange: "<strong>Supported Range:</strong> Standard waist circumference ranges.",
            supportedOS: "<strong>Supported Devices:</strong> iPhone with iOS 17.0 or later",
            freeTier: "The App may offer up to 15 free recordings and then provide a one-time in-app purchase.",
            tokushoFreeTier: "The App offers up to 15 free recordings, after which a one-time in-app purchase unlocks unlimited use.",
            healthCategory: "Browse → Body Measurements → Waist Circumference",
            notMedicalDevice: "The App is not a medical device and does not provide medical advice, diagnosis, or treatment.",
            faq: [
                { q: "Is it free?", a: "<p><strong>Free for the first 15 uses.</strong></p>" },
                { q: "Where is my data stored?", a: "<p>Waist data is stored in <strong>Apple HealthKit on your device</strong>.</p>" },
                { q: "How do I restore my purchase?", a: "<p><strong>To restore:</strong> Open the app → Settings → About → Restore Purchase</p>" }
            ]
        }
    },
    babyvox: {
        name: "BabyVox",
        supportEmail: "babyvox-support@allnew.work",
        icon: "&#x1F476;",
        ja: {
            subtitle: "赤ちゃんの成長記録アプリ",
            description: "音声入力で赤ちゃんの体重・身長をiOSカレンダーに記録するアプリ",
            dataTypes: "体重・身長データ",
            healthKitWrite: "カレンダーへのイベント書き込み",
            healthKitRead: "カレンダーからの記録データの読み取り（推移表示等）",
            cameraUsage: "本アプリはカメラを使用しません",
            importantNote: "本アプリは、体重・身長データを当社の外部サーバーに送信・保存しません。データは端末内のカレンダー（専用カレンダー）に保存されます。Apple HealthKitは使用しません。",
            appOverview: "音声入力により赤ちゃんの体重・身長の値を読み取り、iOSカレンダー（専用カレンダー）に記録する機能を提供します。",
            appOverview2: "ユーザーが任意に許可した場合に限り、カレンダー上の記録データを読み取り、成長推移表示等に利用します。",
            supportedDevices: "<strong>入力方法:</strong> 音声入力。",
            supportedRange: "<strong>対応範囲:</strong> 乳幼児の標準的な体重・身長範囲に対応しています。",
            supportedOS: "<strong>対応デバイス:</strong> iOS 17.0以降を搭載したiPhone。",
            freeTier: "本アプリはカレンダーへの記録について無料で利用できる回数に上限（15回）を設けたうえで、追加利用のための買い切り（アプリ内課金）を提供する場合があります。",
            tokushoFreeTier: "本アプリはカレンダーへの記録について無料で利用できる回数に上限（15回）があり、上限到達後は買い切りのアプリ内課金により利用制限が解除されます。",
            healthCategory: "iOSカレンダーアプリ内の専用カレンダー",
            notMedicalDevice: "本アプリは医療機器ではなく、診断・治療・予防等の医療行為を目的としません。",
            faq: [
                { q: "無料で使えますか？", a: "<p><strong>15回まで無料</strong>でお使いいただけます。</p>" },
                { q: "データはどこに保存されますか？", a: "<p>体重・身長データは<strong>お使いのデバイス内のiOSカレンダー（専用カレンダー）</strong>に保存されます。Apple HealthKitは使用しません。</p>" },
                { q: "購入を復元したい", a: "<p><strong>復元手順:</strong> アプリを開き「設定」→「アプリについて」→「購入を復元」をタップしてください。</p>" }
            ]
        },
        en: {
            subtitle: "Baby Growth Recording App",
            description: "Records baby's weight and height to iOS Calendar via voice input",
            dataTypes: "weight and height data",
            healthKitWrite: "writing events to Calendar",
            healthKitRead: "reading record data from Calendar (to show growth trends)",
            cameraUsage: "This app does not use the camera",
            importantNote: "This app does not send or store weight/height data on our external servers. Data is stored on your device in a dedicated iOS Calendar. Apple HealthKit is not used.",
            appOverview: "The App records baby's weight and height values via voice input and writes data to a dedicated iOS Calendar.",
            appOverview2: "If you optionally grant calendar access, the App may also read data to show growth trends.",
            supportedDevices: "<strong>Input Method:</strong> Voice input.",
            supportedRange: "<strong>Supported Range:</strong> Standard infant weight and height ranges.",
            supportedOS: "<strong>Supported Devices:</strong> iPhone with iOS 17.0 or later",
            freeTier: "The App may offer up to 15 free recordings and then provide a one-time in-app purchase.",
            tokushoFreeTier: "The App offers up to 15 free recordings, after which a one-time in-app purchase unlocks unlimited use.",
            healthCategory: "Dedicated calendar in the iOS Calendar app",
            notMedicalDevice: "The App is not a medical device and does not provide medical advice, diagnosis, or treatment.",
            faq: [
                { q: "Is it free?", a: "<p><strong>Free for the first 15 uses.</strong></p>" },
                { q: "Where is my data stored?", a: "<p>Weight and height data is stored in <strong>a dedicated calendar on your device</strong>. Apple HealthKit is not used.</p>" },
                { q: "How do I restore my purchase?", a: "<p><strong>To restore:</strong> Open the app → Settings → About → Restore Purchase</p>" }
            ]
        }
    },
    coughwav: {
        name: "CoughWav",
        supportEmail: "coughwav-support@allnew.work",
        icon: "&#x1F637;",
        ja: {
            subtitle: "咳モニタリングアプリ",
            description: "マイクで咳の音を検出し、カウント・記録するアプリ",
            dataTypes: "咳の検出データ",
            healthKitWrite: "咳データ（HKCategoryType: coughing）の書き込み",
            healthKitRead: "咳データの読み取り（推移表示等）",
            cameraUsage: "本アプリはカメラを使用しません",
            importantNote: "本アプリは、咳の検出データや音声データを当社の外部サーバーに送信・保存しません。咳の検出データはApple HealthKit（ヘルスケア）に保存されます。音声データは咳の検出処理後に破棄されます。",
            appOverview: "マイクを使用して咳の音を検出し、カウント・記録する機能を提供します。ユーザーの許可に基づき、Apple HealthKitに咳データを書き込みます。",
            appOverview2: "ユーザーが任意に許可した場合に限り、ヘルスケア上の咳データを読み取り、推移表示等に利用します。",
            supportedDevices: "<strong>入力方法:</strong> マイクによる音声検出。",
            supportedRange: "",
            supportedOS: "<strong>対応デバイス:</strong> iOS 17.0以降を搭載したiPhone。",
            freeTier: "本アプリは無料で利用できる回数に上限を設けたうえで、追加利用のための買い切り（アプリ内課金）を提供する場合があります。",
            tokushoFreeTier: "無料で利用できる回数に上限があり、上限到達後は買い切りのアプリ内課金により利用制限が解除されます。",
            healthCategory: "",
            notMedicalDevice: "本アプリは医療機器ではなく、診断・治療・予防等の医療行為を目的としません。",
            faq: [
                { q: "無料で使えますか？", a: "<p>一定回数まで無料でお使いいただけます。</p>" },
                { q: "データはどこに保存されますか？", a: "<p>咳の検出データは<strong>お使いのデバイス内のApple HealthKit（ヘルスケア）</strong>に保存されます。当社が運用するサーバーへの送信はありません。</p>" },
                { q: "購入を復元したい", a: "<p><strong>復元手順:</strong> アプリを開き「設定」→「アプリについて」→「購入を復元」をタップしてください。</p>" }
            ]
        },
        en: {
            subtitle: "Cough Monitoring App",
            description: "Detects and counts cough sounds using the microphone",
            dataTypes: "cough detection data",
            healthKitWrite: "writing cough data (HKCategoryType: coughing)",
            healthKitRead: "reading cough data (to show trends)",
            cameraUsage: "This app does not use the camera",
            importantNote: "This app does not send or store cough detection data or audio on our external servers. Cough detection data is stored in Apple HealthKit on your device. Audio data is discarded after cough detection processing.",
            appOverview: "The App detects and counts cough sounds using the microphone and—based on your permissions—writes cough data to the Apple Health app (via HealthKit).",
            appOverview2: "If you optionally grant read access, the App may also read your cough data from HealthKit to show trends.",
            supportedDevices: "<strong>Input Method:</strong> Microphone-based sound detection.",
            supportedRange: "",
            supportedOS: "<strong>Supported Devices:</strong> iPhone with iOS 17.0 or later",
            freeTier: "The App may offer a limited number of free uses and then provide a one-time in-app purchase.",
            tokushoFreeTier: "Free use has a limit, after which a one-time in-app purchase unlocks unlimited use.",
            healthCategory: "",
            notMedicalDevice: "The App is not a medical device and does not provide medical advice, diagnosis, or treatment.",
            faq: [
                { q: "Is it free?", a: "<p>Free for a limited number of uses.</p>" },
                { q: "Where is my data stored?", a: "<p>Cough detection data is stored in <strong>Apple HealthKit on your device</strong>. We do not transmit data to our servers.</p>" },
                { q: "How do I restore my purchase?", a: "<p><strong>To restore:</strong> Open the app → Settings → About → Restore Purchase</p>" }
            ]
        }
    },
    pupweight: {
        name: "PupWeight",
        supportEmail: "pupweight-support@allnew.work",
        icon: "&#x1F436;",
        ja: {
            subtitle: "ペットの体重記録アプリ",
            description: "音声入力またはカメラ（OCR）でペットの体重を記録するアプリ",
            dataTypes: "ペットの体重データ",
            healthKitWrite: "ペットの体重データは端末内に保存されます",
            healthKitRead: "端末内のペット体重データの読み取り（推移表示等）",
            cameraUsage: "体重計表示の読み取り（OCR）のために撮影画像を一時的に使用",
            importantNote: "本アプリは、ペットの体重データおよび撮影画像を当社の外部サーバーに送信・保存しません。すべてのデータは端末内に保存されます。",
            appOverview: "音声入力または体重計の表示のカメラ撮影（OCR）によりペットの体重値を読み取り、端末内に記録する機能を提供します。",
            appOverview2: "端末内に保存されたデータを読み取り、推移表示等に利用します。",
            supportedDevices: "<strong>対応体重計:</strong> デジタル表示の体重計に対応しています。",
            supportedRange: "<strong>対応範囲:</strong> 一般的なペットの体重範囲に対応しています。",
            supportedOS: "<strong>対応デバイス:</strong> iOS 17.0以降を搭載したiPhone。",
            freeTier: "本アプリは無料で利用できる回数に上限（15回）を設けたうえで、追加利用のための買い切り（アプリ内課金）を提供する場合があります。",
            tokushoFreeTier: "本アプリは無料で利用できる回数に上限（15回）があり、上限到達後は買い切りのアプリ内課金により利用制限が解除されます。",
            healthCategory: "",
            notMedicalDevice: "本アプリは動物用医療機器ではなく、診断・治療・予防等の獣医療行為を目的としません。",
            faq: [
                { q: "無料で使えますか？", a: "<p><strong>15回まで無料</strong>でお使いいただけます。</p>" },
                { q: "データはどこに保存されますか？", a: "<p>ペットの体重データは<strong>お使いのデバイス内</strong>に保存されます。当社が運用するサーバーへの送信はありません。</p>" },
                { q: "購入を復元したい", a: "<p><strong>復元手順:</strong> アプリを開き「設定」→「アプリについて」→「購入を復元」をタップしてください。</p>" }
            ]
        },
        en: {
            subtitle: "Pet Weight Recording App",
            description: "Records your pet's weight via voice input or camera (OCR)",
            dataTypes: "pet weight data",
            healthKitWrite: "pet weight data is stored on your device",
            healthKitRead: "reading pet weight data (to show trends)",
            cameraUsage: "uses captured images temporarily for OCR to read scale displays",
            importantNote: "This app does not send or store your pet's weight data or captured images on our external servers. All data is stored on your device.",
            appOverview: "The App records your pet's weight via voice input or by capturing a photo of your scale display (OCR), and stores it on your device.",
            appOverview2: "Stored data is used for trend display.",
            supportedDevices: "<strong>Supported Scales:</strong> Digital display scales.",
            supportedRange: "<strong>Supported Range:</strong> Standard pet weight ranges.",
            supportedOS: "<strong>Supported Devices:</strong> iPhone with iOS 17.0 or later",
            freeTier: "The App may offer up to 15 free recordings and then provide a one-time in-app purchase.",
            tokushoFreeTier: "The App offers up to 15 free recordings, after which a one-time in-app purchase unlocks unlimited use.",
            healthCategory: "",
            notMedicalDevice: "The App is not a veterinary medical device and does not provide veterinary advice, diagnosis, or treatment.",
            faq: [
                { q: "Is it free?", a: "<p><strong>Free for the first 15 uses.</strong></p>" },
                { q: "Where is my data stored?", a: "<p>Pet weight data is stored <strong>on your device</strong>. We do not transmit data to our servers.</p>" },
                { q: "How do I restore my purchase?", a: "<p><strong>To restore:</strong> Open the app → Settings → About → Restore Purchase</p>" }
            ]
        }
    }
};

/**
 * Get the current app config based on URL parameter
 * @param {string} lang - 'ja' or 'en'
 * @returns {object|null} - { name, supportEmail, icon, ...langData } or null
 */
function getAppConfig(lang) {
    const params = new URLSearchParams(window.location.search);
    const appId = params.get('app') || 'weightsnap';
    const app = APP_DATA[appId];
    if (!app) return null;
    const langData = app[lang];
    if (!langData) return null;
    return {
        id: appId,
        name: app.name,
        supportEmail: app.supportEmail,
        icon: app.icon,
        ...langData
    };
}

/**
 * Apply app-specific data to the page
 * Replaces elements with data-app-* attributes
 */
function applyAppData(lang) {
    const config = getAppConfig(lang);
    if (!config) return null;

    // Replace title
    document.title = document.title.replace(/WeightSnap/g, config.name);

    // Replace text content in elements with data-app attribute
    document.querySelectorAll('[data-app]').forEach(el => {
        const key = el.getAttribute('data-app');
        if (config[key] !== undefined) {
            el.innerHTML = config[key];
        }
    });

    // Replace href in mailto links
    document.querySelectorAll('a[data-app-email]').forEach(el => {
        el.href = 'mailto:' + config.supportEmail + '?subject=' + encodeURIComponent(config.name + ' : ');
        el.textContent = config.supportEmail;
    });

    // Update header app name
    const appNameEl = document.querySelector('.app-name');
    if (appNameEl) {
        appNameEl.textContent = config.name + (lang === 'ja' ? ' サポート' : ' Support');
    }

    return config;
}
