class DbDiff < Formula
  desc "Compare one table across two databases by checksumming"
  homepage "https://matto.club/vetrina/db-diff"
  license "MIT"
  version "0.0.0"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.0/db-diff_0.0.0_darwin_amd64.tar.gz"
      sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.0/db-diff_0.0.0_darwin_arm64.tar.gz"
      sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.0/db-diff_0.0.0_linux_amd64.tar.gz"
      sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.0/db-diff_0.0.0_linux_arm64.tar.gz"
      sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    end
  end

  def install
    bin.install "db-diff"
  end

  test do
    output = shell_output("#{bin}/db-diff --help")
    assert_match "db-diff", output
  end
end
