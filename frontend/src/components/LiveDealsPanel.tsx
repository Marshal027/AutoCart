import { SmartSavings } from "./SmartSavings";

type LiveDealsPanelProps = {
  query?: string;
};

export function LiveDealsPanel({ query }: LiveDealsPanelProps) {
  return (
    <section className="max-w-none min-w-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-['Oswald'] text-3xl font-bold uppercase tracking-wide text-text flex items-center gap-3">
          Live Deals
        </h2>
      </div>
      <SmartSavings currentGoal={query} />
    </section>
  );
}
