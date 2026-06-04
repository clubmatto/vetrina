class Fakedata < Formula
  desc "CLI tool to generate fake data rows for testing and development"
  homepage "https://matto.club/vetrina/fakedata"
  license "MIT"
  head "https://github.com/clubmatto/vetrina.git", branch: "main"

  stable do
    url "https://github.com/clubmatto/vetrina/releases/download/fakedata/vVERSION/fakedata_VERSION_darwin_amd64.tar.gz"
    sha256 "SHA256"
  end

  depends_on "go" => :build

  def install
    cd "fakedata" do
      system "go", "build", "-ldflags", "-s -w -X main.version=#{version}", "-o", bin/"fakedata"
    end
  end

  test do
    output = shell_output("#{bin}/fakedata --help")
    assert_match "fakedata", output
  end
end
