import Head from 'next/head';
import * as THREE from 'three';
import * as React from 'react';
import { useRef, useState } from 'react';
import {
  Canvas,
  useFrame,
  useLoader,
  useThree,
  extend,
} from '@react-three/fiber';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

extend({ TextGeometry });
import {
  ScrollControls,
  Scroll,
  OrthographicCamera,
  Html,
} from '@react-three/drei';

/**
 * Helpful examples:
 * - https://threejs.org/examples/webgl_sprites.html - position sprites according to screen
 */

type BaseImage = {
  text: string;
  id: string;
  height: number;
  textHeight: number | null;
  width: number;
  url: string;
};
type ImageWithPosition = BaseImage & {
  position: [number, number, number];
};

const mindex = (arr: number[]) => arr.indexOf(Math.min(...arr));

function calculatePositions({
  images,
}: {
  images: BaseImage[];
}): ImageWithPosition[] {
  const gutter = 16;
  const columnWidth = 236;
  const columnWidthAndGutter = columnWidth + gutter;
  const containerWidth = window.innerWidth;

  const columnCount = Math.floor(
    (containerWidth + gutter) / columnWidthAndGutter
  );
  const heights = new Array(columnCount).fill(0);

  const centerOffset = Math.max(
    Math.floor(
      (containerWidth - columnWidthAndGutter * columnCount + gutter) / 2
    ),
    0
  );

  return images.map((image) => {
    const { height, textHeight } = image;
    const col = mindex(heights);
    const top = heights[col];
    const left = col * columnWidthAndGutter + centerOffset;

    heights[col] += height + gutter + textHeight + 40;

    return {
      ...image,
      position: [
        left - window.innerWidth / 2,
        -top + window.innerHeight / 2,
        1,
      ],
    };
  });
}

function Item({
  text,
  height,
  width,
  url,
  position,
}: {
  text: string;
  height: number;
  width: number;
  url: string;
  position: [number, number, number];
}) {
  const texture = useLoader(THREE.TextureLoader, url);

  const textHorizontalPadding = 6;
  const textVerticalTopPadding = 8;

  return (
    <>
      <group
        position={[
          position[0] + textHorizontalPadding,
          position[1] - height - textVerticalTopPadding,
          position[2],
        ]}
      >
        <TextNode width={width} text={text} />
      </group>

      <sprite
        position={position}
        scale={[width, height, 1]}
        center={[0, 1]}
        // Ensure that images still render when they are near the edge of the screen
        frustumCulled={false}
      >
        <spriteMaterial map={texture} attach="material" />
      </sprite>
    </>
  );
}

const TextNode = React.forwardRef<
  HTMLDivElement,
  { text: string; width: number }
>(({ text, width }, ref) => {
  const textHorizontalPadding = 6;
  return (
    <Html zIndexRange={[0, 0]}>
      <div
        ref={ref}
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Helvetica, 'ヒラギノ角ゴ Pro W3', 'Hiragino Kaku Gothic Pro', 'メイリオ', Meiryo, 'ＭＳ Ｐゴシック', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
          MozOsxFontSmoothing: 'grayscale',
          WebkitFontSmoothing: 'antialiased',
          display: '-webkit-Box',
          overflow: 'hidden',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
          fontWeight: 600,
          width: width - textHorizontalPadding * 2,
        }}
      >
        {text}
      </div>
    </Html>
  );
});

function MeasureTextNode({
  setImages,
  width,
  text,
  index,
}: {
  width: number;
  text: string;
  index: number;
  setImages: (images: BaseImage[]) => void;
}) {
  const textRef = React.useCallback((node: HTMLDivElement) => {
    if (node == null) {
      return;
    }

    const textHeight = text ? node.getBoundingClientRect().height : 0;

    setImages((images) => {
      return images.map((image, i) => {
        if (i === index && image.textHeight === null) {
          return {
            ...image,
            textHeight,
          };
        }
        return image;
      });
    });
  }, []);

  return (
    <group position={[1148, -100, 1]}>
      <TextNode text={text} width={width} ref={textRef} />
    </group>
  );
}

function Items({ images }: { images: BaseImage[] }) {
  const { camera } = useThree();
  camera.lookAt(0, 0, 0);
  const cornerVec = new THREE.Vector3(-1, 1, 0);
  cornerVec.unproject(camera);

  return (
    <ScrollControls damping={100000} pages={100} distance={1}>
      <Scroll>
        <>
          {calculatePositions({ images }).map(
            ({ text, id, height, width, url, position }) => (
              <React.Suspense fallback={null} key={id}>
                <Item
                  key={id}
                  text={text}
                  height={height}
                  width={width}
                  url={url}
                  position={position}
                />
              </React.Suspense>
            )
          )}
        </>
      </Scroll>
    </ScrollControls>
  );
}

function Masonry() {
  const [images, setImages] = useState<BaseImage[]>([]);

  React.useEffect(() => {
    fetch(`api/images`, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    })
      .then((res) => res.json())
      .then(
        ({
          data,
        }: {
          data: [
            {
              title: string;
              description: string;
              id: string;
              image_medium_size_pixels: {
                width: number;
                height: number;
              };
              image_medium_url: string;
              type: string;
            }
          ];
        }) => {
          setImages(
            [...data, ...data, ...data, ...data, ...data]
              ?.filter(({ type }) => type === 'pin')
              .map(
                ({
                  title,
                  description,
                  id,
                  image_medium_size_pixels,
                  image_medium_url,
                }) => ({
                  text: title?.trim() || description?.trim(),
                  id,
                  height:
                    (image_medium_size_pixels?.height /
                      image_medium_size_pixels?.width) *
                    236,
                  width: 236,
                  url: image_medium_url.replace(
                    'https://i.pinimg.com/',
                    '/image/'
                  ),
                  textHeight: null,
                })
              )
          );
        }
      );
  }, []);

  const width = typeof window !== 'undefined' ? window.innerWidth : 0;
  const height = typeof window !== 'undefined' ? window.innerHeight : 0;
  const imagesWithoutTextHeight = images.filter(
    ({ textHeight }) => textHeight === null
  );

  console.log(
    `imagesWithTextHeight`,
    images
      .filter(({ textHeight }) => textHeight !== null)
      .map(({ textHeight }) => textHeight)
      .join(',')
  );

  return (
    <Canvas dpr={[1, 2]}>
      <>
        {imagesWithoutTextHeight.length > 0
          ? images.map(({ text, id, url }, index) => (
              <React.Suspense fallback={null} key={`${id}-${index}`}>
                <MeasureTextNode
                  images={images}
                  setImages={setImages}
                  index={index}
                  width={width}
                  text={text}
                />
              </React.Suspense>
            ))
          : null}
      </>

      {imagesWithoutTextHeight.length === 0 && (
        <>
          <OrthographicCamera
            makeDefault
            zoom={1}
            left={-width / 2}
            right={width / 2}
            top={height / 2}
            bottom={-height / 2}
            near={1}
            far={100}
            position={[0, 0, 10]}
          />
          <Items images={images}></Items>
        </>
      )}
    </Canvas>
  );
}

export default function Home() {
  return (
    <div>
      <Head>
        <title>WebGL Masonry: Scroll issue</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Masonry />

      <style jsx global>{`
        html,
        body,
        body > div:first-child,
        div#__next,
        div#__next > div {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
        }
        body {
          overscroll-behavior: none;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        #container {
          width: 100vw;
          height: 100vh;
        }
        canvas {
          display: block;
        }
      `}</style>
    </div>
  );
}
