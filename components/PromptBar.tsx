"use client";

import { useState } from "react";
import PromptBox from "@/components/PromptBox";

export default function PromptBar() {
  const [isLoading, setIsLoading] = useState(false);
  return <PromptBox isLoading={isLoading} setIsLoading={setIsLoading} />;
}