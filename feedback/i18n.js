(function () {
  const storageKey = "poipoi_feedback_language";
  const supportedLanguages = new Set(["ja", "en"]);

  const enText = {
    "AllNew ホーム": "AllNew Home",
    "匿名ユーザー": "Guest",
    "受付状況": "Status",
    "ログアウト": "Log out",
    "スキップ →": "Skip ->",
    "あったらいいなぁ": "Turn wishful ideas",
    "を、カタチにする。": "into real apps.",
    "あなたのひとことが、アプリのあしたをつれてくる。": "One small note from you can shape tomorrow's apps.",
    "へようこそ！": " welcomes you!",
    "こちらは、AllNewアプリの": "This is the reception desk for",
    "「改善とアイデア」の受付窓口です。": "AllNew app improvements and ideas.",
    "わたしたちの開発チームへ": "Tell our development team",
    "「こんなの、あったらいいなぁ」": "what you wish existed",
    "を、お伝えいただくサイトです。": "for AllNew apps.",
    "みなさんのちょっとした": "Share small observations,",
    "「気づき」や不具合のことを、": "bugs, and moments where",
    "気軽にお伝えください。": "something could work better.",
    "アプリについてのご意見を": "Send feedback",
    "お寄せください。": "about our apps.",
    "開発チーム（AIと人間）がぜんぶ目を通して、": "Our team, humans and AI together, reviews every message",
    "できる範囲でいろいろがんばってみます。": "and does what we can to improve the apps.",
    "「ここ、ちょっとおかしいぞ」を送る": "Report something that feels wrong",
    "不具合や、使っていて気になったこと、開発チームに教えてください。": "Tell the team about bugs or anything that felt off while using an app.",
    "「こんなのあったらなぁ」を送る": "Suggest something you wish existed",
    "新しいアプリのアイデアを教えてください。できる範囲でがんばってみます。": "Share ideas for new apps or better features. We will explore what we can.",
    "「どうなってる？」をのぞいてみる": "Check what happened next",
    "ご意見の受付状況や、開発のいまを確認できます。": "See submitted feedback and what is currently moving through development.",
    "とりあえず、見物してみる": "Browse first",
    "サインイン不要": "No sign-in needed",
    "Appleでサインイン": "Sign in with Apple",
    "（無料。登録料・利用料はかかりません）": "Free to use. No registration or usage fee.",
    "利用規約": "Terms of Use",
    "プライバシーポリシー": "Privacy Policy",
    "Cookie/外部送信ポリシー": "Cookie / External Transmission Policy",
    "自分の受付": "My submissions",
    "みんなの受付": "Public board",
    "あなたの受付": "Your submissions",
    "まだ自分の受付はありません。送信すると、次回ここで受付番号と進み具合を確認できます。": "You do not have any submissions yet. After sending one, you can come back here to see the reception ID and progress.",
    "全公開要望": "Public items",
    "すべて": "All",
    "受け付けました": "Received",
    "検討しています": "Reviewing",
    "対応しています": "In progress",
    "出来ました": "Released",
    "ごめんなさい": "Not planned",
    "検索": "Search",
    "並び替え": "Sort",
    "更新日が新しい順": "Newest update first",
    "更新日が古い順": "Oldest update first",
    "受付日が新しい順": "Newest received first",
    "受付日が古い順": "Oldest received first",
    "Goodが多い順": "Most Good first",
    "詳しい条件": "More filters",
    "期間": "Period",
    "全期間": "All time",
    "1週間": "1 week",
    "1ヶ月": "1 month",
    "3ヶ月": "3 months",
    "半年": "6 months",
    "1年": "1 year",
    "開始日": "Start date",
    "終了日": "End date",
    "アプリ": "App",
    "WeightSnap": "WeightSnap",
    "GlucoSnap": "GlucoSnap",
    "ThermoSnap": "ThermoSnap",
    "新アプリ案": "New app idea",
    "その他": "Other",
    "表示": "View",
    "自分の投稿": "My posts",
    "0件を表示しています。": "Showing 0 items.",
    "条件をリセット": "Reset filters",
    "公開中の受付はまだありません。登録すると、自分の要望を送って進み具合を確認できます。": "There are no public submissions yet. Sign in to send your own request and track its progress.",
    "登録して要望を送る": "Sign in and send a request",
    "気づきやアイデアを送る": "Send feedback or an idea",
    "Step 1": "Step 1",
    "ポイナが受付します。今日はどういうご用件ですか？": "Poina is ready. What can we help with today?",
    "ポイナ受付": "Poina Reception",
    "ポイナです。POIPOI受付へようこそ。": "I am Poina. Welcome to POIPOI Reception.",
    "AllNewアプリの不具合、改善アイデア、新しいアプリ案を送れます。": "You can send bugs, improvement ideas, and new app ideas for AllNew apps.",
    "おかえりなさい。今日もポイナがうかがいます。": "Welcome back. Poina is ready to listen today.",
    "前回の続きでも、新しい内容でも大丈夫です。": "You can continue from last time or start something new.",
    "いつもありがとうございます。": "Thank you for coming back.",
    "今日はどのようなご用件でしょうか？": "What would you like to do today?",
    "今日のご用件": "Today's request type",
    "不具合を伝える": "Report a bug",
    "動かない、表示がおかしい、送れない": "Not working, display looks wrong, cannot send",
    "改善アイデア": "Improvement idea",
    "もっと使いやすく、分かりやすくしたい": "Make it easier or clearer to use",
    "新しいアプリ案": "New app idea",
    "アイデアについてお聞かせください": "Tell us about your idea",
    "受付状況を見る": "View status",
    "公開中の受付状況をご確認いただけます": "Check currently public reception statuses",
    "対象アプリ": "Target app",
    "対象アプリを選択して下さい。": "Choose the app this is about.",
    "対象アプリを選択してください。": "Choose the app this is about.",
    "不具合ですね。対象アプリを選択してください。": "Got it, this is a bug report. Choose the app this is about.",
    "改善アイデアですね。対象アプリを選択してください。": "Got it, this is an improvement idea. Choose the app this is about.",
    "健康": "Health",
    "ペット": "Pet",
    "集中": "Focus",
    "条件に合うアプリが見つかりません。検索語を短くするか、絞り込みを「すべて」に戻してください。": "No matching apps were found. Try a shorter search or reset the filter to All.",
    "このアプリについてですね。この内容で進めますか？": "This is about this app. Continue?",
    "ちがいます": "Change",
    "はい、進める": "Yes, continue",
    "ポイナがお話をうかがいます。": "Poina will listen to your request.",
    "個人情報は書かないでください。": "Do not enter personal information.",
    "電話番号、メールアドレス、住所、本名、パスワード、体重などの数値は入力しないでください。見つかった場合は、送信前に書き直しをお願いすることがあります。": "Do not enter phone numbers, email addresses, addresses, real names, passwords, body weight, or other personal values. If found, we may ask you to rewrite before sending.",
    "ポイナへ送る内容": "Message to Poina",
    "送る": "Send",
    "送信前チェック": "Pre-send check",
    "会話の内容をもとに、送信できる状態か確認します。": "Poina will check whether the conversation is ready to send.",
    "送信前に内容を確認してください。": "Please review before sending.",
    "この内容で受付できます。": "This is ready to submit.",
    "この内容でお預かりできます。": "This is ready to submit.",
    "ありがとうございます。この内容で受付できます。": "Thank you. This is ready to submit.",
    "ありがとうございます。この内容でお預かりできます。": "Thank you. This is ready to submit.",
    "ありがとうございます。不具合として受付できます。": "Thank you. This can be received as a bug report.",
    "ありがとうございます。誰が、どんな場面で、何に困るかをもう少しだけ書いてください。": "Thank you. Please add a little more about who is affected, when it happens, and what is difficult.",
    "ありがとうございます。どなたが、どのような場面で困るかを、もう少しだけ教えてください。": "Thank you. Please add a little more about who is affected and when it happens.",
    "ありがとうございます。どなたが、どのような場面で困るかを、もう少しだけ教えてください。個人情報は不要です。": "Thank you. Please add a little more about who is affected and when it happens. Personal information is not needed.",
    "お知らせいただき、ありがとうございました。すぐに担当者と確認いたします。": "Thank you for letting us know. We will check it with the person in charge.",
    "ありがとうございます。その困りごとは、AllNewで検討します。送信後に受付番号が表示されます。": "Thank you. AllNew will review that need. A reception ID will appear after you send it.",
    "もう少し情報を足すと、内容が伝わりやすくなります。": "A little more detail will help us understand it clearly.",
    "種類": "Type",
    "内容": "Content",
    "不具合": "Bug report",
    "ご意見": "Feedback",
    "氏名、連絡先、体重などの数値は書かないでください。状況だけで送信できます。送信後に受付番号が表示され、あとで受付状況を確認できます。": "Do not include your name, contact details, body weight, or similar values. You can send only the situation. A reception ID will appear after sending, and you can check the status later.",
    "体重などの数値は書かないでください。状況だけでお預かりできます。送信後に受付番号が表示され、あとで受付状況を確認できます。": "Do not include body weight or similar values. You can send only the situation. A reception ID will appear after sending, and you can check the status later.",
    "氏名、連絡先、住所、パスワードなどの個人情報は書かないでください。状況だけでお預かりできます。送信後に受付番号が表示されます。": "Do not include your name, contact details, address, password, or other personal information. You can send only the situation. A reception ID will appear after sending.",
    "いただいたアイデアは、AllNewの新しいアプリ案としてお預かりします。氏名や連絡先などの個人情報は書かず、このまま送信してください。送信後に受付番号が表示されます。": "We will receive this as a new app idea for AllNew. Do not include personal information such as your name or contact details. A reception ID will appear after sending.",
    "個人情報や秘密情報に見える内容が含まれているようです。恐れ入りますが、その部分を伏せて、起きたことやご要望だけを書き直してください。": "This appears to include personal or confidential information. Please remove that part and rewrite only what happened or what you would like to improve.",
    "恐れ入りますが、この内容はそのままではお預かりできません。アプリの不具合、使いにくさ、あったらいい機能のどれかに絞って書き直してください。": "We cannot receive this as written. Please rewrite it as an app bug, usability issue, or feature idea.",
    "恐れ入りますが、この内容はそのままではお預かりできません。個人情報や秘密情報を入れず、アプリの不具合や改善案に絞って書き直してください。": "We cannot receive this as written. Please remove personal or confidential information and focus on an app bug or improvement idea.",
    "ありがとうございます。診断や治療の判断にあたる内容は、この受付では扱えません。アプリの表示、操作、記録のしやすさについて気になった点を教えてください。": "Thank you. This reception cannot handle diagnosis or treatment decisions. Please tell us what you noticed about app display, operation, or ease of recording.",
    "内容を修正できます。直した内容をもう一度送ってください。": "You can edit the message. Send the revised version again.",
    "申し訳ありません。いまポイナにつながりませんでした。少し時間をおいて、もう一度送ってください。": "Sorry, Poina could not connect right now. Please wait a moment and send it again.",
    "内容を直す": "Edit",
    "確認して送る →": "Review and send ->",
    "このまま送る →": "Send as is ->",
    "運営管理レビュー": "Admin review",
    "本番では管理者認証の内側で、受付内容、公開ステータス、運営向け要約を確認する画面です。": "In production, this screen sits behind admin authentication for checking submissions, public status, and admin summaries.",
    "会社情報": "Company info",
    "事業者情報はAllNewコーポレートサイトの会社概要から確認できます。": "Company information is available on the AllNew corporate website.",
    "Cookieと外部送信について": "Cookies and external transmission",
    "本サイトは、ログイン維持、不正対策、同意状態の保存に必要なCookieのみを使用します。": "This site uses only cookies needed to keep you signed in, prevent abuse, and save consent status.",
    "広告目的のトラッキングCookieは使用しません。Appleでサインインやポイナ受付を利用する場合、認証・AI応答のため外部サービスへ情報が送信されます。": "We do not use advertising tracking cookies. When you use Sign in with Apple or Poina Reception, information is sent to external services for authentication and AI responses.",
    "本サイトは、サインイン状態の維持・不正対策・同意記録の保存に必要な「必須Cookie」を使用します。": "This site uses strictly necessary cookies to keep you signed in, prevent abuse, and store your consent record.",
    "Goodの記録や受付履歴の表示に使う「機能Cookie・ブラウザ保存」は、同意いただいた場合のみ使用します。": "Functional cookies and browser storage (for your Good votes and submission history) are used only with your consent.",
    "広告・アクセス解析目的のトラッキングCookieは使用しません。": "We do not use any advertising or analytics tracking cookies.",
    "Appleでサインインやポイナ受付の利用時には、認証・AI応答のため外部サービスへ情報が送信されます。": "When you use Sign in with Apple or Poina Reception, information is sent to external services for authentication and AI responses.",
    "選択は後からページ下部の「Cookie設定」でいつでも変更できます。": "You can change your choice at any time via \"Cookie settings\" at the bottom of the page.",
    "必須のみ許可": "Essential only",
    "すべて同意": "Accept all",
    "Cookie設定": "Cookie settings",
    "くわしく見る": "Learn more",
    "確認して閉じる": "Got it",
    "はじめる前に、3つの重要事項をご確認ください。": "Before you begin, please review these three important points.",
    "初回登録のご確認": "Registration check",
    "閉じる": "Close",
    "このサイトでできること": "What this site can do",
    "アプリへの気づき、改善案、新規アイデアなどを投稿し、公開ボードにて対応状況を確認できます。": "You can send observations, improvement ideas, and new app ideas, then check progress on the public board.",
    "投稿内容の権利がAllNewに譲渡（帰属）され、開発・公開等のために無償で利用されることに同意します。": "I agree that submitted content is assigned to AllNew and may be used free of charge for development, publication, and related purposes.",
    "採用・実装・公開・特典提供が保証されないこと、秘密情報や第三者の権利を侵害する内容を投稿しないことを確認しました。": "I understand that adoption, implementation, publication, or rewards are not guaranteed, and I will not submit confidential information or content that infringes third-party rights.",
    "私は18歳以上であり、利用規約、プライバシーポリシー、Cookie/外部送信ポリシーを確認しました。": "I am at least 18 years old and have reviewed the Terms, Privacy Policy, and Cookie / External Transmission Policy.",
    "3つの確認にチェックすると、Appleでサインインできます。": "Check all three items to sign in with Apple.",
    "登録に進むには、3つの確認にチェックしてください。": "Please check all three items to continue registration.",
    "同意内容を確認したうえで、Appleの認証画面へ進みます。": "After confirming your consent, you will proceed to Apple's authentication screen.",
    "同意内容を確認する": "Review consent",
    "戻る": "Back",
    "トップページ": "Top page",
    "要望を送る": "Send a request",
    "公開ボード": "Public board",
    "POIPOI STATUS BOARD": "POIPOI STATUS BOARD",
    "みんなの声と": "Everyone's feedback",
    "開発のいま": "and development now",
    "いただいた「気づき」や「あったらいいなぁ」が、": "See how submitted observations and ideas",
    "いまどこまで進んでいるかを確認できます。": "are moving through the process.",
    "開発チームとAIで協力しながら、アプリをもっと良くしていきます。": "The development team and AI work together to make the apps better.",
    "公開ボードで受付状況と開発の進み具合を確認するイメージ": "Illustration of checking reception status and development progress",
    "AIロボットと開発メンバーが進捗ボードを確認するイラスト": "AI robot and development team reviewing a progress board",
    "STATUS BOARD": "STATUS BOARD",
    "0件を表示しています（全0件）。": "Showing 0 of 0 items.",
    "受付状況の表示切替": "Switch status view",
    "MY RECEPTION": "MY RECEPTION",
    "Appleでサインインした端末では、送信した受付番号と進み具合をここで確認できます。": "On a device signed in with Apple, you can check your reception IDs and progress here.",
    "ステータスで絞り込み": "Filter by status",
    "見送り・保留": "Not planned / on hold",
    "公開ボードの検索と並び替え": "Search and sort the public board",
    "すべてのアプリ": "All apps",
    "カテゴリで絞り込み": "Filter by category",
    "使いやすさ": "Ease of use",
    "新しい機能": "New feature",
    "見た目・表示": "Visuals / display",
    "記録・同期": "Records / sync",
    "アプリで絞り込み": "Filter by app",
    "最近の受付状況": "Recent reception statuses",
    "公開中の受付はまだありません。": "There are no public submissions yet.",
    "登録して最初の要望を送る": "Sign in and send the first request",
    "受付状況の詳細": "Submission status details",
    "詳しく見る": "View details",
    "これまでの流れ": "Timeline",
    "あなたの受付": "Your submission",
    "Appleでサインインすると、ポイナが呼び名を決めます。": "When you sign in with Apple, Poina will choose a nickname for you.",
    "ポイナが受付しました": "Poina received it",
    "受付内容": "Submission",
    "下記の内容で受け付けました。": "We received the following details.",
    "【日時】": "Date",
    "【受付No.】": "Reception No.",
    "【対象】": "Target",
    "【内容】": "Content",
    "他にも何かお気づきの点がございましたら、お聞かせください。": "If you noticed anything else, please tell us.",
    "続ける": "Continue",
    "終了する": "Finish",
    "本日はご利用ありがとうございました。": "Thank you for using POIPOI today.",
    "受付内容はこの端末に控えています。公開ボードでは要約される場合があります。": "This device keeps a copy of your submission. The public board may show a summarized version."
  };

  const enAttributes = {
    "AllNew ホーム": "AllNew Home",
    "Appleでサインイン": "Sign in with Apple",
    "説明セクションの進行": "Intro section progress",
    "ようこそへ": "Go to welcome",
    "アプリの検索と絞り込み": "Search and filter apps",
    "カテゴリで絞り込み": "Filter by category",
    "前のアプリを見る": "View previous app",
    "対象アプリ一覧": "Target app list",
    "次のアプリを見る": "View next app",
    "個人情報入力についての注意": "Personal information notice",
    "POIPOI受付チャット": "POIPOI reception chat",
    "ポイナへ送る内容": "Message to Poina",
    "メッセージを送る": "Send message",
    "サイトの法務文書": "Site legal documents",
    "登録前に確認できる文書": "Documents you can review before registration",
    "今日のご用件": "Today's request type",
    "受付状況の表示切替": "Switch status view",
    "公開ボードの絞り込みと並び替え": "Filter and sort the public board",
    "公開中の受付状況": "Public submission statuses",
    "ページメニューを開く": "Open page menu",
    "ページメニュー": "Page menu",
    "公開ボードで受付状況と開発の進み具合を確認するイメージ": "Illustration of checking reception status and development progress",
    "受付状況の詳細": "Submission status details",
    "最近の受付状況": "Recent reception statuses",
    "公開ボードの検索と並び替え": "Search and sort the public board"
  };

  const enPlaceholders = {
    "アプリ名・用途で探す": "Search by app name or purpose",
    "不具合、改善アイデア、新しいアプリ案などを自由に書いてください。": "Freely write a bug, improvement idea, or new app idea.",
    "どなたが、どのような場面で困るかを教えてください。": "Tell us who is affected and when it happens.",
    "気になったことをそのまま教えてください。": "Tell us what you noticed.",
    "キーワード・受付番号で探す": "Search by keyword or reception ID",
    "アプリ名・タイトル・内容で探す": "Search by app, title, or content"
  };

  const patterns = [
    [/^(.+)で、どの画面で、何をした時に、どうなったかを書いてください。$/, "$1: describe which screen you were on, what you did, and what happened."],
    [/^(.+)で起きていることを教えてください。$/, "$1: tell us what is happening."],
    [/^(.+)で、使いにくい点やこうなると助かることを書いてください。$/, "$1: describe what felt hard to use or what would help."],
    [/^(.+)で、こうなると助かることを教えてください。$/, "$1: tell us what change would help."],
    [/^(.+)の不具合ですね。ご不便をおかけして申し訳ありません。不具合の具体的な内容を教えていただけますか？$/, "$1 bug report. Sorry for the inconvenience. Please tell us what is happening."],
    [/^(.+)の不具合ですね。ご不便をおかけして申し訳ありません。差し支えない範囲で、具体的な内容を教えていただけますか？$/, "$1 bug report. Sorry for the inconvenience. Please tell us what is happening, as much as you can share."],
    [/^(.+)の不具合ですね。起きていることをそのまま書いてください。氏名や連絡先は不要です。$/, "$1 bug report. Please describe what is happening. Do not include your name or contact details."],
    [/^(.+)の不具合ですね。起きていることをそのまま書いてください。体重などの数値や氏名は不要です。$/, "$1 bug report. Please describe what is happening. Do not include body values or your name."],
    [/^(.+)の改善アイデアですね。迷ったところ、使いづらかったところ、こうなると助かることを1つ書いてください。$/, "$1 improvement idea. Please write one thing that was confusing, hard to use, or would help."],
    [/^(.+)の改善アイデアですね。より使いやすくするために、こうなると助かることを1つ教えていただけますか？$/, "$1 improvement idea. Please tell us one change that would make it easier to use."],
    [/^(.+)についてお聞かせください。気になったことをそのまま教えてください。$/, "Tell us about $1. Please share what you noticed."],
    [/^新しいアプリ案ですね。アイデアについてお聞かせください。どなたが、どのような場面で困るかを、思いつく範囲で教えてください。$/, "New app idea. Tell us about your idea, including who is affected and when it happens, as much as you can."],
    [/^(.+)の不具合ですね。進めますか？$/, "$1 bug report. Continue?"],
    [/^(.+)の改善アイデアですね。進めますか？$/, "$1 improvement idea. Continue?"],
    [/^ありがとうございます。アイコン表示の不具合ですね。$/, "Thank you. This sounds like an icon display issue."],
    [/^ありがとうございます。(.+)の不具合ですね。$/, "Thank you. This sounds like a $1 issue."],
    [/^(.+)のアイコン表示ですね。どの操作のあとに起きるかだけ教えてください。$/, "$1 icon display. Please tell us which action caused it."],
    [/^(.+)の不具合ですね。どの操作のあとに起きるかだけ教えてください。$/, "$1 bug report. Please tell us which action caused it."],
    [/^(.+)の(.+)ですね。進めますか？$/, "$1 $2. Continue?"],
    [/^(.+)の(.+)ですね。どの操作のあとに起きるかだけ教えてください。$/, "$1 $2. Please tell us which action caused it."],
    [/^(.+)の改善アイデアですね。どう変わると使いやすいかを1つだけ教えてください。$/, "$1 improvement idea. Please tell us one change that would make it easier to use."],
    [/^ありがとうございます。(.+)をより使いやすくするご提案ですね。どのように変わると助かるか、1つだけ教えていただけますか？$/, "Thank you. This is an improvement idea for $1. Please tell us one change that would help."],
    [/^ありがとうございます。(.+)の不具合として受付できます。$/, "Thank you. This can be received as a $1 bug report."],
    [/^ありがとうございます。(.+)の改善アイデアとして受付できます。$/, "Thank you. This can be received as a $1 improvement idea."],
    [/^ありがとうございます。(.+)の改善のご意見として、お預かりいたします。内部で確認の上、検討を進めてまいります。$/, "Thank you. We will receive this as improvement feedback for $1 and review it internally."],
    [/^恐れ入りますが、この内容はそのままでは送信できません。(.+)$/, "This cannot be sent as written. $1"],
    [/^この内容はそのままでは受付できません。(.+)$/, "This cannot be received as written. $1"],
    [/^(.+)件を表示しています（全(.+)件）。$/, "Showing $1 of $2 items."],
    [/^(.+)件を表示しています。$/, "Showing $1 items."],
    [/^(.+)件の自分の受付を表示しています。$/, "Showing $1 of your submissions."],
    [/^受付 (.+) \/ 更新 (.+)$/, "Received $1 / Updated $2"],
    [/^最新: (.+)$/, "Latest: $1"],
    [/^受付日: (.+)$/, "Received: $1"],
    [/^ステータス: (.+)$/, "Status: $1"],
    [/^期間: (.+)$/, "Period: $1"],
    [/^アプリ: (.+)$/, "App: $1"],
    [/^検索: (.+)$/, "Search: $1"],
    [/^開始: (.+)$/, "Start: $1"],
    [/^終了: (.+)$/, "End: $1"],
    [/^ポイナはあなたを「(.+)」と呼びます。$/, "Poina will call you \"$1\"."],
    [/^(.+)の受付$/, "$1's submissions"],
    [/^送る前に確認が必要です。(.+)にあたる情報が含まれていないか見直してください。$/, "Please review before sending. Check whether it includes information related to $1."],
    [/^(.+)についてですね。この内容で進めますか？$/, "This is about $1. Continue?"]
  ];

  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  let activeLanguage = "ja";
  let observer = null;
  let isApplying = false;

  function normalizeLanguage(value) {
    const normalized = String(value || "").toLowerCase().slice(0, 2);
    return supportedLanguages.has(normalized) ? normalized : "ja";
  }

  function getLanguageFromUrl() {
    try {
      const value = new URL(window.location.href).searchParams.get("lang");
      return value ? normalizeLanguage(value) : "";
    } catch {
      return "";
    }
  }

  function getInitialLanguage() {
    return getLanguageFromUrl()
      || (localStorage.getItem(storageKey) ? normalizeLanguage(localStorage.getItem(storageKey)) : "")
      || normalizeLanguage(document.documentElement.lang)
      || "ja";
  }

  function translateValue(value) {
    const source = String(value || "").trim();
    if (!source) return value;
    if (enText[source]) return enText[source];
    if (enAttributes[source]) return enAttributes[source];
    if (enPlaceholders[source]) return enPlaceholders[source];
    for (const [regex, replacement] of patterns) {
      if (regex.test(source)) return source.replace(regex, replacement);
    }
    return value;
  }

  function hasJapanese(value) {
    return /[\u3040-\u30ff\u3400-\u9fff]/.test(String(value || ""));
  }

  function translateTextNode(node) {
    if (!node.nodeValue || !node.nodeValue.trim()) return;
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    if (activeLanguage === "en" && hasJapanese(node.nodeValue) && node.nodeValue !== originalText.get(node)) {
      originalText.set(node, node.nodeValue);
    }
    const original = originalText.get(node);
    if (activeLanguage === "ja") {
      if (node.nodeValue !== original) node.nodeValue = original;
      return;
    }

    const leading = original.match(/^\s*/)?.[0] || "";
    const trailing = original.match(/\s*$/)?.[0] || "";
    const translated = translateValue(original.trim());
    if (translated !== original.trim()) {
      const nextValue = `${leading}${translated}${trailing}`;
      if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
    }
  }

  function shouldSkipElement(element) {
    return element.closest("script, style, noscript, svg, canvas")
      || element.closest("[data-i18n-skip]");
  }

  function translateAttributes(element) {
    if (!(element instanceof HTMLElement)) return;
    const attrs = ["aria-label", "title", "alt", "placeholder"];
    attrs.forEach((attr) => {
      if (!element.hasAttribute(attr)) return;
      if (!originalAttributes.has(element)) originalAttributes.set(element, {});
      const stored = originalAttributes.get(element);
      if (!Object.prototype.hasOwnProperty.call(stored, attr)) stored[attr] = element.getAttribute(attr);
      if (activeLanguage === "en" && hasJapanese(element.getAttribute(attr)) && element.getAttribute(attr) !== stored[attr]) {
        stored[attr] = element.getAttribute(attr);
      }
      const original = stored[attr] || "";
      if (activeLanguage === "ja") {
        if (element.getAttribute(attr) !== original) element.setAttribute(attr, original);
        return;
      }
      const map = attr === "placeholder" ? enPlaceholders : enAttributes;
      const translated = map[original] || translateValue(original);
      if (element.getAttribute(attr) !== translated) element.setAttribute(attr, translated);
    });
  }

  function translateTree(root = document.body) {
    if (!root) return;
    const rootElement = root.nodeType === Node.ELEMENT_NODE ? root : root.parentElement;
    if (rootElement && shouldSkipElement(rootElement)) return;

    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }

    if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        return element && shouldSkipElement(element) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
      if (node.nodeType === Node.ELEMENT_NODE) translateAttributes(node);
    }
  }

  function updateLinksForLanguage() {
    // Local legal documents have dedicated English pages (terms-en.html,
    // cookie-policy-en.html): keep links in sync with the selected language.
    document.querySelectorAll('a[href*="terms"], a[href*="cookie-policy"]').forEach((link) => {
      const href = link.getAttribute("href") || "";
      const match = href.match(/^(\.\/)?(terms|cookie-policy)(-en)?\.html(.*)$/);
      if (!match) return;
      const next = `./${match[2]}${activeLanguage === "en" ? "-en" : ""}.html${match[4] || ""}`;
      if (href !== next) link.setAttribute("href", next);
    });
    document.querySelectorAll('a[href*="allnew.work"]').forEach((link) => {
      try {
        const url = new URL(link.href);
        if (url.hostname.endsWith("allnew.work")) {
          url.searchParams.set("lang", activeLanguage);
          // Corporate pages route by path prefix (/ja/privacy, /en/privacy):
          // keep the document language in sync with the selected UI language.
          url.pathname = url.pathname.replace(/^\/(ja|en)(\/|$)/, `/${activeLanguage}$2`);
          link.href = url.toString();
        }
      } catch {
        // Ignore non-standard URLs.
      }
    });
  }

  function updateSwitcher() {
    document.querySelectorAll("[data-language-choice]").forEach((button) => {
      const isActive = button.dataset.languageChoice === activeLanguage;
      button.classList.toggle("is-active", isActive);
      const nextPressed = isActive ? "true" : "false";
      if (button.getAttribute("aria-pressed") !== nextPressed) button.setAttribute("aria-pressed", nextPressed);
    });
  }

  function updateUrlLanguage(language) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", language);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // file:// without full URL support is still usable without rewriting.
    }
  }

  function setLanguage(language, options = {}) {
    const nextLanguage = normalizeLanguage(language);
    activeLanguage = nextLanguage;
    document.documentElement.lang = nextLanguage === "en" ? "en" : "ja";
    document.documentElement.dataset.language = nextLanguage;
    localStorage.setItem(storageKey, nextLanguage);
    if (options.updateUrl !== false) updateUrlLanguage(nextLanguage);

    isApplying = true;
    translateTree(document.body);
    updateLinksForLanguage();
    updateSwitcher();
    isApplying = false;
  }

  function injectSwitcher() {
    if (document.querySelector(".poipoi-language-switcher")) return;
    const host = document.querySelector(".app-header") || document.querySelector(".board-topbar") || document.body;
    const switcher = document.createElement("div");
    switcher.className = "poipoi-language-switcher";
    switcher.setAttribute("aria-label", "Language");
    switcher.innerHTML = [
      '<button type="button" data-language-choice="ja" aria-pressed="false">日本語</button>',
      '<button type="button" data-language-choice="en" aria-pressed="false">English</button>'
    ].join("");
    switcher.addEventListener("click", (event) => {
      const button = event.target.closest("[data-language-choice]");
      if (!button) return;
      setLanguage(button.dataset.languageChoice || "ja");
    });
    host.append(switcher);
  }

  function injectStyles() {
    if (document.getElementById("poipoiLanguageStyles")) return;
    const style = document.createElement("style");
    style.id = "poipoiLanguageStyles";
    style.textContent = `
      .poipoi-language-switcher {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        min-height: 34px;
        padding: 3px;
        border: 1px solid rgba(39, 82, 132, 0.14);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.86);
        box-shadow: 0 10px 24px rgba(31, 78, 130, 0.08);
      }
      .poipoi-language-switcher button {
        min-height: 28px;
        padding: 4px 9px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: #65718a;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 750;
        white-space: nowrap;
      }
      .poipoi-language-switcher button.is-active {
        background: #0a7dff;
        color: #fff;
        box-shadow: 0 8px 18px rgba(10, 125, 255, 0.18);
      }
      .board-topbar .poipoi-language-switcher {
        margin-left: auto;
      }
      .app-header .poipoi-language-switcher {
        margin-left: auto;
        margin-right: 10px;
      }
      @media (max-width: 560px) {
        .poipoi-language-switcher button {
          padding-inline: 8px;
          font-size: 11px;
        }
        .app-header .poipoi-language-switcher {
          margin-right: 6px;
        }
      }
      html[data-language="en"] .account-strip::before {
        content: "Active";
      }
    `;
    document.head.append(style);
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver((mutations) => {
      if (isApplying || activeLanguage === "ja") return;
      isApplying = true;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => translateTree(node));
        if (mutation.type === "characterData") translateTree(mutation.target);
        if (mutation.type === "attributes") translateAttributes(mutation.target);
      });
      updateSwitcher();
      isApplying = false;
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "title", "alt", "placeholder"]
    });
  }

  function init() {
    injectStyles();
    injectSwitcher();
    setLanguage(getInitialLanguage(), { updateUrl: Boolean(getLanguageFromUrl()) });
    startObserver();
  }

  window.PoipoiI18n = {
    get language() {
      return activeLanguage;
    },
    setLanguage,
    translateValue,
    catalogUrl() {
      return `https://apps.allnew.work/?lang=${activeLanguage}`;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
