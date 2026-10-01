class DbDiff < Formula
  desc "Compare one table across two databases by checksumming"
  homepage "https://matto.club/vetrina/db-diff"
  license "MIT"
  version "0.0.1"

  if OS.mac?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.1/db-diff_0.0.1_darwin_amd64.tar.gz"
      sha256 "e17da742a1e5a2f2063f9517d00f1a297b6b4e670815822b5581a78ca5d21d12"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.1/db-diff_0.0.1_darwin_arm64.tar.gz"
      sha256 "8fc84ce613fbb2befbf0ba527e77a05be53610b4b2f5eb2f2e3df4ff66f2efb1"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.1/db-diff_0.0.1_linux_amd64.tar.gz"
      sha256 "9431dc34ebd2c4c329d73d4020efb695541d7435fb5f65ad64c0aa5dd043bb39"
    elsif Hardware::CPU.arm?
      url "https://github.com/clubmatto/vetrina/releases/download/db-diff/v0.0.1/db-diff_0.0.1_linux_arm64.tar.gz"
      sha256 "7165d8c3e143f3ece195bd72eb777d4f2a87b8e54332eb36a08c02e9c8faa475"
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
