# Biggr web

Biggr のランディングページです。

静的HTMLを `docs/` に置き、そのまま配信します。ローカル確認では `docs/` をHTTPサーバーで公開します。

## iPhoneからTailscale越しに開発する

自宅で動いているMacへiPhoneからSSHで接続し、Codexに修正を依頼し、そのままiPhoneのSafariで確認するための手順です。

この手順では、Tailscaleは接続経路として使います。SSHサーバーはmacOS標準の「リモートログイン」を使います。Tailscale SSHのサーバー機能は通常のmacOS GUI版では制約があるためです。

### 前提

- MacとiPhoneにTailscaleをインストールし、同じTailnetへログインしている
- MacでCodex CLIを使える
- iPhoneにSSHクライアントを入れている
- Macのローカルrepoが `/Users/takanorihirohashi/biggr-web` にある

### Mac側の準備

MacでTailscaleの接続状態を確認します。

```sh
tailscale status
```

macOSの「システム設定」から「リモートログイン」を有効にします。

repoへ移動します。

```sh
cd /Users/takanorihirohashi/biggr-web
```

`docs/` をローカル配信します。

```sh
python3 -m http.server 8000 --directory docs
```

別のターミナルで、Tailscale Serveを使ってTailnet内へHTTPS公開します。

```sh
tailscale serve --https=443 http://127.0.0.1:8000
```

Serveの状態を確認します。

```sh
tailscale serve status
```

### iPhoneからSSHする

iPhoneでTailscaleを接続します。

SSHクライアントからMacへ接続します。

```sh
ssh <macユーザー名>@<macのTailscale名またはTailnet IP>
```

接続後、repoへ移動してCodexを起動します。

```sh
cd /Users/takanorihirohashi/biggr-web
codex
```

### iPhoneで確認する

iPhoneのSafariでTailscale ServeのURLを開きます。

```text
https://<macのTailscale HTTPS名>/ja/
https://<macのTailscale HTTPS名>/en/
```

Mac名やHTTPS名が分からない場合は、Mac側で次を確認します。

```sh
tailscale serve status
tailscale status
```

### 日常の開発フロー

1. iPhoneでTailscaleを接続する
2. SSHでMacへ入る
3. `/Users/takanorihirohashi/biggr-web` へ移動する
4. Codexへ修正を依頼する
5. Safariで `https://<macのTailscale HTTPS名>/ja/` を確認する
6. 気づいた点をCodexへ再度フィードバックする
7. 必要に応じて差分を確認する

```sh
git status --short
git diff
```

### トラブルシュート

iPhoneからページを開けない場合は、次を確認します。

- iPhoneとMacのTailscaleが接続中か
- Macで `python3 -m http.server 8000 --directory docs` が動いているか
- Macで `tailscale serve status` が有効な設定を返すか
- Macがスリープしていないか
- iPhoneのSafariで `https://` から始まるServe URLを開いているか

443番ポートでServeできない場合は、別ポートを使います。

```sh
tailscale serve --https=8443 http://127.0.0.1:8000
```

この場合は、iPhoneで次のように開きます。

```text
https://<macのTailscale HTTPS名>:8443/ja/
```

SSHできない場合は、次を確認します。

- macOSの「リモートログイン」が有効か
- SSHのユーザー名がMacのユーザー名と一致しているか
- 接続先がMacのTailscale名またはTailnet IPになっているか
- macOSのファイアウォールがSSHを拒否していないか

### セキュリティ

- この用途ではTailscale Funnelを使いません。Tailnet外へ公開しないためです。
- Tailnetへ参加させる端末は必要最小限にします。
- Macのスリープ設定を変える場合は、開発中だけにします。
