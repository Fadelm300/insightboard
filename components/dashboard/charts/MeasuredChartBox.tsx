"use client";

import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Box } from "@mui/material";

type MeasuredChartBoxProps = {
  height?: number;
  children: (size: { width: number; height: number }) => ReactNode;
};

export default function MeasuredChartBox({
  height = 330,
  children,
}: MeasuredChartBoxProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const currentElement = ref.current;

    if (currentElement === null) {
      return;
    }

    const element: HTMLDivElement = currentElement;

    const measure = () => {
      const nextWidth = Math.floor(element.getBoundingClientRect().width);

      if (nextWidth > 0) {
        setWidth(nextWidth);
      }
    };

    measure();

    const frameId = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);

    observer.observe(element);
    window.addEventListener("resize", measure);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        width: "100%",
        height,
        minHeight: height,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {width > 0 ? children({ width, height }) : null}
    </Box>
  );
}