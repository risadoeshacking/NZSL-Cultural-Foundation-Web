import { useParams } from "react-router-dom";
import PagePlaceholder from "../components/PagePlaceholder";

export default function ProgrammeDetail() {
  const { slug } = useParams();
  return <PagePlaceholder title={`Programme: ${slug}`} />;
}
