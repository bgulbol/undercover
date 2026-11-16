import { Link, NavLink, Route, Routes } from "react-router";
import { ClaimPage } from "./ClaimPage";
import { QueuePage } from "./QueuePage";

export function App() {
  return (
    <>
      <header className="header">
        <Link className="brand" to="/">
          UnderCover
        </Link>
        <span className="tagline">Claims, straight through</span>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>
            Queue
          </NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<QueuePage />} />
          <Route path="/claims/:claimId" element={<ClaimPage />} />
        </Routes>
      </main>
    </>
  );
}
