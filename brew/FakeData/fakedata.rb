class Fakedata < Formula
  desc "CLI tool to generate fake data rows for testing and development"
  homepage "https://matto.club/vetrina/fakedata"
  license "MIT"
  version "0.0.1"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.1/fakedata_0.0.1_darwin_amd64.tar.gz"
      sha256 "a6596fa77977605b752331a4212a8d01cc75190974ee56bb397a3459bf261d83"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.1/fakedata_0.0.1_darwin_arm64.tar.gz"
      sha256 "ad9766fc17ed7fa151e030a8e702e3195f6b73ee27c2ca2103a5c40e60866b3d"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.1/fakedata_0.0.1_linux_amd64.tar.gz"
      sha256 "a9e20169c3c71cf2c111e63141759ae6fdb3dad74b5b9719c15350a1ef868c3f"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.1/fakedata_0.0.1_linux_arm64.tar.gz"
      sha256 "5dfeb37a1bee7b1307129d183c1c2b934c0f7260a703a7c939a1b0887f5e1dec"
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
