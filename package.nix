{ pkgs, lib, stdenv }:

let
  fs = lib.fileset;
  sourceFiles = ./src;
  # sourceFiles = fs.gitTracked ./src;
  # sourceFiles = fs.unions [
  #   ./Cargo.toml
  #   ./Cargo.lock
  #   (fs.fileFilter
  #     (file: file.hasExt "rs")
  #     ./src
  #   )
  # ];
in

stdenv.mkDerivation {
  pname = "gnome-shell-extension-max-if-lonely@jensbin.github.com";
  version = "1.2.0";
  src = fs.toSource {
    root = ./src;
    fileset = sourceFiles;
  };
  nativeBuildInputs = with pkgs; [ buildPackages.glib ];
  buildPhase = ''
    runHook preBuild
    if [ -d schemas ]; then
      glib-compile-schemas --strict schemas
    fi
    runHook postBuild
  '';
  installPhase = ''
    runHook preInstall
    mkdir -p $out/share/gnome-shell/extensions/
    cp -r -T . $out/share/gnome-shell/extensions/max-if-lonely@jensbin.github.com
    runHook postInstall
  '';
  meta = {
    description = "Maximize window on empty workspace";
  };
}
