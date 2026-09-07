{
  description = "adhd-helper development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];
      forEachSystem = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forEachSystem (pkgs: {
        # Node 24 to match .nvmrc, which CI reads. Rolldown needs styleText from
        # node:util, added in Node 20.12, so anything older fails at startup.
        default = pkgs.mkShell {
          packages = [ pkgs.nodejs_24 ];
        };
      });
    };
}
