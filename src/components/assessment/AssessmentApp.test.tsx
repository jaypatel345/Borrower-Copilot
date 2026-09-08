import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AssessmentApp } from "./AssessmentApp";

afterEach(cleanup);

// getByText / getByRole throw when nothing matches, so calling them IS the
// assertion. exists() keeps intent readable without @testing-library/jest-dom.
const exists = (el: unknown) => expect(el).toBeTruthy();

describe("AssessmentApp — sample borrowers render end-to-end", () => {
  it("Ravi -> Borrow less, secured routing, safe vs lender both shown", () => {
    render(<AssessmentApp />);
    fireEvent.click(screen.getByText(/Ravi, 42/));
    exists(screen.getByText(/O1 · The verdict/i));
    exists(screen.getByText(/Borrow less/i));
    exists(screen.getByText(/Routed to a secured loan/i));
    exists(screen.getByText(/Safe for you — use this/i));
    expect(screen.getAllByText(/A lender might sanction/i).length).toBeGreaterThan(0);
  });

  it("Anita -> Don't borrow, shows 'Effectively nil'", () => {
    render(<AssessmentApp />);
    fireEvent.click(screen.getByText(/Anita, 35/));
    expect(screen.getAllByText(/Don't borrow/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Effectively nil/i).length).toBeGreaterThan(0);
  });

  it("Priya -> negotiation card tab shows 'Say this' + KFS ask", () => {
    render(<AssessmentApp />);
    fireEvent.click(screen.getByText(/Priya, 29/));
    fireEvent.click(screen.getByRole("button", { name: /Negotiation card/i }));
    exists(screen.getByText(/Say this/i));
    exists(screen.getByText(/Please share the Key Facts Statement/i));
  });

  it("disclosures section lists assumptions", () => {
    render(<AssessmentApp />);
    fireEvent.click(screen.getByText(/Ravi, 42/));
    exists(screen.getByText(/Where this is guessing/i));
    expect(screen.getAllByText(/market reference/i).length).toBeGreaterThan(0);
  });
});

describe("AssessmentApp — manual flow", () => {
  it("advances past Q1 and Back returns to it", () => {
    render(<AssessmentApp />);
    fireEvent.click(screen.getByText(/Start —/i));
    exists(screen.getByText(/What's the money for\?/i));
    fireEvent.click(screen.getByText(/A wedding/i));
    exists(screen.getByText(/What kind of loan/i));
    fireEvent.click(screen.getByLabelText(/Back/i));
    exists(screen.getByText(/What's the money for\?/i));
  });

  it("reaches the credit-score question with an explicit 'I don't know it'", () => {
    render(<AssessmentApp />);
    fireEvent.click(screen.getByText(/Start —/i));
    fireEvent.click(screen.getByText(/A wedding/i));
    fireEvent.click(screen.getByText(/Personal loan/i));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "800000" } });
    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "110000" } });
    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));
    fireEvent.click(screen.getByText(/A regular salary/i));
    fireEvent.click(screen.getByRole("button", { name: /Nothing/i }));
    fireEvent.click(screen.getByRole("button", { name: /I'm not sure/i }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "29" } });
    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));
    exists(screen.getByText(/Do you know your credit score\?/i));
    exists(screen.getByRole("button", { name: /I don't know it/i }));
  });
});
