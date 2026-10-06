class DbDiff < Formula
  desc "Compare one table across two databases by checksumming"
  homepage "https://matto.club/vetrina/db-diff"
  license "MIT"
  version "0.0.3"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.3/db-diff_0.0.3_darwin_amd64.tar.gz"
      sha256 "d7ea63a38f903dc6a1643538f08c2bcbec344e041e9dbdbe1c429b5f729414ac"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.3/db-diff_0.0.3_darwin_arm64.tar.gz"
      sha256 "4bab130175e58cdfefc134cd8580910977d602928d06a20d77a0110644c68fe4"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.3/db-diff_0.0.3_linux_amd64.tar.gz"
      sha256 "a0bb1c50a78f041a4a1573a5f419ec24646383fcc2d8782c971fff9aa19efaaa"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.3/db-diff_0.0.3_linux_arm64.tar.gz"
      sha256 "fb8f99fbce20dae2da294500a83489e1adb39d185a95a9d6d8b63baf73c508e2"
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
