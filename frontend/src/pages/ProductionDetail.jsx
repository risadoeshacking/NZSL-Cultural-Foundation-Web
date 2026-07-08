import { useParams } from "react-router-dom";
import PagePlaceholder from "../components/PagePlaceholder";

export default function ProductionDetail() {
  const { slug } = useParams();
  return <PagePlaceholder title={`Production: ${slug}`} />;
}
