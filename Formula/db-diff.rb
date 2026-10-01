class DbDiff < Formula
  desc "Compare one table across two databases by checksumming"
  homepage "https://matto.club/vetrina/db-diff"
  license "MIT"
  version "0.0.2"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.2/db-diff_0.0.2_darwin_amd64.tar.gz"
      sha256 "68a621f4ecf7f9cdc2cd092060725a4d7fb6de267006325a14a71bf8f024a3ce"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.2/db-diff_0.0.2_darwin_arm64.tar.gz"
      sha256 "974e300adee3295f9cf96c43cce74f313f69325fbd93f52dce934b873f9dc128"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.2/db-diff_0.0.2_linux_amd64.tar.gz"
      sha256 "a3cc3621dd37dffd14d12ce7bdc75e11992f4aeda07c820803d8a1d67f98738c"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.2/db-diff_0.0.2_linux_arm64.tar.gz"
      sha256 "a2178e3692601997cd43664d7a4d4a593831eff7f6975077fe43979f657c3192"
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
