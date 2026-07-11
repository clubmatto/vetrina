class Fakedata < Formula
  desc "CLI tool to generate fake data rows for testing and development"
  homepage "https://matto.club/vetrina/fakedata"
  license "MIT"
  version "0.1.0"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.1.0/fakedata_0.1.0_darwin_amd64.tar.gz"
      sha256 "865c2d2433d66394a2b6693807feb1fff7cb627b7a4f1f46edd9fd08b7c8815c"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.1.0/fakedata_0.1.0_darwin_arm64.tar.gz"
      sha256 "4fa563a10a1c3679faecbab8a26ea650ac7e65d9fb9e39cbf37b31123d6c6356"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.1.0/fakedata_0.1.0_linux_amd64.tar.gz"
      sha256 "9e783d50ccbbcd1fb7f040abd8974391158f6ddd48e9285ed4eb11f6ab1a2faf"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/v0.1.0/fakedata_0.1.0_linux_arm64.tar.gz"
      sha256 "84fc961180dac1f64df350c4234a91332187936241710e2b9b805608622fae58"
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
