class Fakedata < Formula
  desc "CLI tool to generate fake data rows for testing and development"
  homepage "https://matto.club/vetrina/fakedata"
  license "MIT"
  version "VERSION"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/vVERSION/fakedata_VERSION_darwin_amd64.tar.gz"
      sha256 "MAC_AMD64_SHA256"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/vVERSION/fakedata_VERSION_darwin_arm64.tar.gz"
      sha256 "MAC_ARM64_SHA256"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/vVERSION/fakedata_VERSION_linux_amd64.tar.gz"
      sha256 "LINUX_AMD64_SHA256"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/fakedata/vVERSION/fakedata_VERSION_linux_arm64.tar.gz"
      sha256 "LINUX_ARM64_SHA256"
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
