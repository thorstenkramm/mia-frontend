// Tailwind Plus: Application UI > Feedback > Empty States > Simple
// Library version: 2026-09-13-083323. The product-action button is removed because this is a public scaffold only.
export function App() {
  return (
    <>
      <title>MIA scaffold | MIA</title>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-10 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-gray-900 focus:shadow-xs"
        href="#main-content"
      >
        Skip to main content
      </a>
      <main
        id="main-content"
        className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12"
        tabIndex={-1}
      >
        <section
          className="w-full text-center"
          aria-labelledby="scaffold-title"
        >
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="mx-auto size-12 text-gray-400"
          >
            <path
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1
            id="scaffold-title"
            className="mt-2 text-sm font-semibold text-gray-900"
            tabIndex={-1}
          >
            MIA scaffold
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            The application shell is being prepared.
          </p>
          <p
            className="mt-6 text-sm text-gray-500"
            data-testid="build-identifier"
          >
            Build {__MIA_BUILD_ID__}
          </p>
        </section>
      </main>
    </>
  );
}
