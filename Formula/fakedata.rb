class Fakedata < Formula
  desc "CLI tool to generate fake data rows for testing and development"
  homepage "https://matto.club/vetrina/fakedata"
  license "MIT"
  version "0.1.1"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.1.1/fakedata_0.1.1_darwin_amd64.tar.gz"
      sha256 "f8871af62f548a86c072931569dcbc9d8408b4c561961ec376a98931efa86556"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.1.1/fakedata_0.1.1_darwin_arm64.tar.gz"
      sha256 "514a1fd71289c154ea187fbc607a8b1e1363569c24fb8599cae9926f2be00aa4"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.1.1/fakedata_0.1.1_linux_amd64.tar.gz"
      sha256 "4ae94356a9b35480100c8c3dba014ed4bd1f0d852678f518808f0825d839b14e"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.1.1/fakedata_0.1.1_linux_arm64.tar.gz"
      sha256 "661aa203d25c6c16b2cf79c21a430eff616cdd0fe1f4b5e90c304dfd421791db"
    end
  end

  def install
    bin.install "fakedata"
  end

  test do
    output = shell_output("#{bin}/fakedata --help")
    assert_match "fakedata", output
  end
end
