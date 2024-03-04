{
  description = "GCC Explorer";
  inputs.nixpkgs.url = "github:nixos/nixpkgs";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
        gcc-explorer = pkgs.callPackage ./nix-support/source.nix {};
        run-local = pkgs.writeScriptBin "run-gcc-explorer" ''
          #!${pkgs.stdenv.shell}
          ${pkgs.static-web-server}/bin/static-web-server \
              --port=80 \
              --root=${gcc-explorer}
        '';
      in {
        apps = {
          default = {
            type = "app";
            program = "${run-local}/bin/run-gcc-explorer";
          };
        };
        packages = {
          docker-image = pkgs.dockerTools.buildImage {
            name = "jarkinstall/gcc-explorer";
            tag = pkgs.stdenv.system;
            config = {
              Cmd = [ "${run-local}/bin/run-gcc-explorer" ];
              ExposedPorts = {
                "80/tcp" = {};
              };
            };
          };
        };

        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [ static-web-server ];
        };
      });
}
