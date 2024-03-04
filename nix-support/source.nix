{ pkgs ? import <nixpkgs> {} }:

pkgs.stdenv.mkDerivation{
  name = "gcc-explorer-source";
  phases = ["unpackPhase" "installPhase"];
  unpackPhase = ''
    cp ${../index.html} index.html;
    cp -r ${../style}   style;
    cp -r ${../scripts} scripts;
    cp -r ${../favicon} favicon;
  '';
  installPhase = ''
    mkdir -p $out;
    cp -r . $out;
  '';
}
