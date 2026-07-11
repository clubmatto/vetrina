class Fakedata < Formula
  desc "CLI tool to generate fake data rows for testing and development"
  homepage "https://matto.club/vetrina/fakedata"
  license "MIT"
  version "0.0.5"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.5/fakedata_0.0.5_darwin_amd64.tar.gz"
      sha256 "73d6b4c888c201be87c9928a5e3b0ec87226727ed64c99f340402bf078d3dbd6"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.5/fakedata_0.0.5_darwin_arm64.tar.gz"
      sha256 "0db570ccd99330e6f1ffad3bf85ecd6a8184df28f0caa3030f1857c4650f3e39"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.5/fakedata_0.0.5_linux_amd64.tar.gz"
      sha256 "b6faa4c269357ea9965f14370a91c72fc89fa1f9d75dc114b3b71bcd7efdaf86"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.0.5/fakedata_0.0.5_linux_arm64.tar.gz"
      sha256 "4272daf90f3f81516dfe4c800f00c0574fc2cd95058a3130a7b4b160fcbc8c87"
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
