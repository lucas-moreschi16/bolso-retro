#!/usr/bin/env python3
"""Cria pasta de instalacao Android independente e verificavel.

Uso: python3 scripts/preparar_instalador.py --apk app/build/outputs/apk/debug/app-debug.apk --output dist/instalador
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import zipfile


def main():
    parser = argparse.ArgumentParser(description='Monta instalador web do Bolso Retro')
    parser.add_argument('--apk', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--version', default='1.0.0')
    args = parser.parse_args()
    if not args.apk.is_file() or args.apk.stat().st_size == 0:
        parser.error(f'APK compilado nao encontrado ou vazio: {args.apk}')
    if not zipfile.is_zipfile(args.apk):
        parser.error('O arquivo informado nao e um APK valido (ZIP Android).')
    with zipfile.ZipFile(args.apk) as pkg:
        contents = set(pkg.namelist())
        if not {'AndroidManifest.xml', 'classes.dex'} <= contents:
            parser.error('Arquivo sem AndroidManifest.xml ou classes.dex; confira o resultado do build.')
    out = args.output
    out.mkdir(parents=True, exist_ok=True)
    project = Path(__file__).resolve().parents[1]
    shutil.copy2(project / 'installer' / 'index.html', out / 'index.html')
    dest = out / 'BolsoRetro.apk'
    shutil.copy2(args.apk, dest)
    metadata = {'ready': True, 'file': dest.name,
                'version': re.sub('[^0-9a-zA-Z._-]', '', args.version),
                'bytes': dest.stat().st_size,
                'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()}
    (out / 'config.js').write_text('window.BOLSO_RELEASE = ' + json.dumps(metadata) + ';\n', encoding='utf-8')
    (out / 'LEIA-ME.txt').write_text(
      'BOLSO RETRO - INSTALADOR ANDROID\n\n'
      'O arquivo BolsoRetro.apk e o instalador.\n'
      'Transfira-o para seu telefone Android, abra-o e confirme a instalacao.\n'
      'Se publicar esta pasta em um servidor HTTPS, abra index.html no celular.\n\n'
      'AVISO: este build de teste depende do EmulatorJS via CDN se o motor\n'
      'nao estiver incluido no pacote Android. Nenhuma ROM e fornecida.\n'
      'Importante: o APK de debug pode nao atualizar builds anteriores se a\n'
      'chave de assinatura for diferente. Guarde backups de suas partidas.\n'
      f'SHA-256: {metadata["sha256"]}\n', encoding='utf-8')
    print(f'Pacote do instalador criado em {out} ({metadata["bytes"]} bytes).')
    print(f'SHA-256: {metadata["sha256"]}')


if __name__ == '__main__':
    main()
