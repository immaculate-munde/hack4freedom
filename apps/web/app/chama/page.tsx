import { ChamaGate } from "../../components/chama-gate";
import { ChamaFlow } from "./chama-flow";

export default function ChamaPage() {
  return (
    <ChamaGate>
      <ChamaFlow />
    </ChamaGate>
  );
}
