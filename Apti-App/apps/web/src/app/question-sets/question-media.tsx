import { questionMediaSchema } from "@aptiquiz/database";

export function QuestionMedia({ media }: { media: unknown }) {
  if (media === null || media === undefined) return null;
  const { imageUrl, table } = questionMediaSchema.parse(media);
  return (
    <div className="mt-4 space-y-4">
      {imageUrl ? (
        // biome-ignore lint/performance/noImgElement: Host supplied image hosts cannot be allowlisted for Next Image.
        <img
          alt="Question illustration"
          className="max-h-80 max-w-full rounded-lg object-contain"
          loading="lazy"
          src={imageUrl}
        />
      ) : null}
      {table ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {table.headers.map((heading, index) => (
                  <th
                    className="border border-stone-300 bg-stone-100 p-2"
                    // biome-ignore lint/suspicious/noArrayIndexKey: Table cells have no state and retain source order.
                    key={`${index}-${heading}`}
                    scope="col"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Table rows have no state and retain source order.
                <tr key={`${rowIndex}-${row.join("|")}`}>
                  {row.map((cell, cellIndex) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Table cells have no state and retain source order.
                    <td className="border border-stone-300 p-2" key={`${cellIndex}-${cell}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
