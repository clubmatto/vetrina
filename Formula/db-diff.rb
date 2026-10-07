class DbDiff < Formula
  desc "Compare one table across two databases by checksumming"
  homepage "https://matto.club/vetrina/db-diff"
  license "MIT"
  version "0.0.4"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.4/db-diff_0.0.4_darwin_amd64.tar.gz"
      sha256 "09fe981725b39a841760910eb1b2da3b00287c73c54f500e50455fd2b8735b55"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.4/db-diff_0.0.4_darwin_arm64.tar.gz"
      sha256 "0692980c9686f8987661b5e2d97d6e305e2425f74c8f9b0bd04a35104efcd180"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.4/db-diff_0.0.4_linux_amd64.tar.gz"
      sha256 "ed3ffc4db9f8cf45074d4b3ece0a172b48b375260674d355218f59ce8a98ea9a"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.4/db-diff_0.0.4_linux_arm64.tar.gz"
      sha256 "868b03aa186f149e26a55d8b0c5be2574bb34e07c2ee56db737c0256ef977f15"
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
