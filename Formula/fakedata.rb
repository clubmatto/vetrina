class Fakedata < Formula
  desc "CLI tool to generate fake data rows for testing and development"
  homepage "https://matto.club/vetrina/fakedata"
  license "MIT"
  version "0.1.2"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.1.2/fakedata_0.1.2_darwin_amd64.tar.gz"
      sha256 "f59dafe0e8d39d812ce829d471c105c086eee34ef193faf53301aa08b0773c99"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.1.2/fakedata_0.1.2_darwin_arm64.tar.gz"
      sha256 "169b7d69a77573f811e2963e0f7e0595e3a562449a34a9a3b646d436f7988b9c"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.1.2/fakedata_0.1.2_linux_amd64.tar.gz"
      sha256 "9dd7c1c5a2c947cce27094c2f5e44233c380751d44653a874fb82c8377f16922"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.1.2/fakedata_0.1.2_linux_arm64.tar.gz"
      sha256 "68071483ced1326cc5c2ec10ccc26eeb70a94ddc51ef18be5013619561af0073"
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
