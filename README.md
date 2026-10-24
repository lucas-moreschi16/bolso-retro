# Bolso Retro — GBA e Nintendo DS (Android)

Projeto Android de uso pessoal: biblioteca de ROMs, importação local, favoritos, controles do EmulatorJS e gerador de APK de teste.

## Instalacao do CODIGO no novo GitHub (importante)

**Nao envie este ZIP fechado para o repositorio**. GitHub nao extrai arquivos ZIP no commit nem executa workflows guardados dentro dele.

1. Extraia este ZIP no computador. Ele foi criado com os arquivos na **raiz**, incluindo a pasta oculta `.github`.
2. No GitHub, crie um repositório e escolha **Add file > Upload files**. Arraste para essa pagina **todos os arquivos e pastas extraidos** (`.github`, `app`, `scripts`, `installer`, `build.gradle`, `settings.gradle`, etc.). Confirme que o caminho `.github/workflows/build-apk.yml` aparece no GitHub.
3. Faça **Commit changes**. A aba **Actions** deve iniciar a execução **Gerar APK do Bolso Retro** no ramo `main` ou `master`.
4. Se a compilação terminar com sucesso (sinal verde), clique no run e baixe o artefato **BolsoRetro-APK**. **Extraia esse artefato** para obter o arquivo `BolsoRetro.apk`.
5. Transfira `BolsoRetro.apk` para o Android e abra-o no aplicativo Arquivos para instalar. O Android pode pedir autorização para instalar apps desta origem.

O **ZIP deste projeto NAO contem um APK**. O APK só aparece depois de executar e concluir a compilação. 

## Correcoes em relação às versões anteriores

- Pasta `.github/workflows` presente diretamente na raiz: sem ZIP dentro de ZIP ou etapa extra de descompactação.
- `android-actions/setup-android@v4` (versão que nao solicita o pacote `tools`, removido do SDK atual).
- `sdkmanager` entra no PATH pelo setup-android v4; instala SDK API 35 e build-tools 35.0.0.
- Runner `ubuntu-24.04`, JDK 17, Gradle 8.9 e Android Gradle Plugin 8.7.3.
- Validação do conteúdo do APK (manifest, `classes.dex`) e cálculo SHA-256 no script do instalador.

## O que o app faz

- Importa ROMs `.gba`, `.nds` e arquivos `.zip` compatíveis usando o seletor do Android.
- Biblioteca e configurações locais em IndexedDB (não há envio das ROMs para servidores).
- GBA usa núcleo mGBA e Nintendo DS pode usar DeSmuME/DeSmuME2015 via EmulatorJS.
- Controles virtuais e salvamentos oferecidos pelo motor de emulação, sujeitos à compatibilidade do dispositivo.
- Pacote instalador HTML opcional, sem instalação automática ou silenciosa.

### Limites técnicos — leia antes de instalar

**Ainda não foi compilado ou testado neste ambiente**; a compilação do GitHub será o primeiro teste real do APK. A execução GBA/DS, desempenho e persistência de save states também não foram validados em aparelho físico.

**Jogar requer internet quando o motor de emulação não estiver empacotado.** Neste código, a interface e as ROMs são locais, mas o player procura a pasta `app/src/main/assets/emulator-data/` e, se não encontrar os recursos completos do EmulatorJS, recorre à CDN oficial. Para jogar 100% offline, será preciso incorporar a distribuição compatível do EmulatorJS e seus núcleos a essa pasta **antes** de compilar. Essa etapa ainda não está automatizada. Não confunda o APK instalável com um emulador totalmente offline.

O APK de debug é assinado com chave temporária do runner: futuras compilações podem não atualizar o aplicativo instalado sem remoção, o que pode apagar seus dados/saves. Antes de atualizar, tenha cópia dos seus arquivos e dados importantes. A assinatura persistente precisa ser configurada separadamente para atualizações seguras.

Não inclua ROMs, BIOS ou firmware no repositório. Utilize apenas arquivos cuja utilização seja autorizada.

## Estrutura

```
.github/workflows/build-apk.yml  # CI, executada na raiz
app/src/main/                 # Java, AndroidManifest, WebView, biblioteca web
app/src/main/assets/          # interface, importação de ROMs, player
app/src/main/assets/emulator-data/ # opcional: motor emulador offline (não incluído)
installer/                    # página de instalação opcional
scripts/preparar_instalador.py # valida e embala APK gerado
build.gradle, settings.gradle, gradle.properties
```

## Compilacao manual (alternativa)

Requisitos: JDK 17, Android SDK Platform 35, Build Tools 35.0.0 e Gradle 8.9.

```bash
gradle --no-daemon assembleDebug
python3 scripts/preparar_instalador.py \
  --apk app/build/outputs/apk/debug/app-debug.apk \
  --output dist/instalador --version 1.0.0
```

GitHub Actions dispensa o Android Studio e fornece os artefatos em sua interface após uma execução bem-sucedida.
