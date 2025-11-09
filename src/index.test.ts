import changelogFunctions from "./index"
import parse from "@changesets/parse"
import type { getInfo, getInfoFromPullRequest } from "@changesets/get-github-info"

type GetInfoRequest = Parameters<typeof getInfo>[0]
type GetInfoFromPullRequestRequest = Parameters<typeof getInfoFromPullRequest>[0]

const getReleaseLine = changelogFunctions.getReleaseLine

const mockData = {
  commit: "a085003",
  user: "Andarist",
  pull: 1613,
  repo: "emotion-js/emotion",
}

const mockLinks = {
  user: `[@${mockData.user}](https://github.com/${mockData.user})`,
  pull: `[#${mockData.pull}](https://github.com/${mockData.repo}/pull/${mockData.pull})`,
  commit: `[\`${mockData.commit}\`](https://github.com/${mockData.repo}/commit/${mockData.commit})`,
}

jest.mock("@changesets/get-github-info", () => ({
  getInfo: ({ commit, repo }: GetInfoRequest) => {
    expect(commit).toBe(mockData.commit)
    expect(repo).toBe(mockData.repo)
    return Promise.resolve({
      pull: mockData.pull,
      user: mockData.user,
      links: mockLinks,
    })
  },
  getInfoFromPullRequest: ({ pull, repo }: GetInfoFromPullRequestRequest) => {
    expect(pull).toBe(mockData.pull)
    expect(repo).toBe(mockData.repo)
    return Promise.resolve({
      commit: mockData.commit,
      user: mockData.user,
      links: mockLinks,
    })
  },
}))

const getChangeset = (content: string, commit: string | undefined) => {
  const parsed = parse(
    `---
pkg: "minor"
---
something
${content}
`,
  )
  return [
    {
      ...parsed,
      id: "some-id",
      ...(commit !== undefined ? { commit } : {}),
    },
    "minor",
    { repo: mockData.repo },
  ] as const
}

describe.each([mockData.commit, "wrongcommit", undefined])(
  "with commit from changeset of %s",
  (commitFromChangeset) => {
    describe.each(["pr", "pull request", "pull"])("override pr with %s keyword", (keyword) => {
      test.each(["with #", "without #"] as const)(" %s", async (kind) => {
        const result = await getReleaseLine(
          ...getChangeset(
            `${keyword}: ${kind === "with #" ? "#" : ""}${mockData.pull}`,
            commitFromChangeset,
          ),
        )
        expect(result).toEqual(
          `\n\n- [#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003) Thanks [@Andarist](https://github.com/Andarist)! - something\n`,
        )
      })
    })

    test("override commit with commit keyword", async () => {
      const result = await getReleaseLine(
        ...getChangeset(`commit: ${mockData.commit}`, commitFromChangeset),
      )
      expect(result).toEqual(
        `\n\n- [#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003) Thanks [@Andarist](https://github.com/Andarist)! - something\n`,
      )
    })
  },
)

describe.each(["author", "user"])("override author with %s keyword", (keyword) => {
  test.each(["with @", "without @"] as const)(" %s", async (kind) => {
    const result = await getReleaseLine(
      ...getChangeset(`${keyword}: ${kind === "with @" ? "@" : ""}other`, mockData.commit),
    )
    expect(result).toEqual(
      `\n\n- [#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003) Thanks [@other](https://github.com/other)! - something\n`,
    )
  })
})

it("with multiple authors", async () => {
  const result = await getReleaseLine(
    ...getChangeset(["author: @Andarist", "author: @mitchellhamilton"].join("\n"), mockData.commit),
  )
  expect(result).toBe(
    "\n\n- [#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003) Thanks [@Andarist](https://github.com/Andarist), [@mitchellhamilton](https://github.com/mitchellhamilton)! - something\n",
  )
})

it("with clickup link", async () => {
  const result = await getReleaseLine(
    ...getChangeset("clickup: https://app.clickup.com/t/86evcnyrg", mockData.commit),
  )
  expect(result).toBe(
    "\n\n- [#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003) Thanks [@Andarist](https://github.com/Andarist)! ClickUp: [86evcnyrg](https://app.clickup.com/t/86evcnyrg) - something\n",
  )
})

it("with multiple clickup links", async () => {
  const result = await getReleaseLine(
    ...getChangeset(
      [
        "clickup: https://app.clickup.com/t/86evcnyrg",
        "clickup: https://app.clickup.com/t/another",
      ].join("\n"),
      mockData.commit,
    ),
  )
  expect(result).toBe(
    "\n\n- [#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003) Thanks [@Andarist](https://github.com/Andarist)! ClickUp: [86evcnyrg](https://app.clickup.com/t/86evcnyrg), [another](https://app.clickup.com/t/another) - something\n",
  )
})
