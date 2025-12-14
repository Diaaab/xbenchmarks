export function getComparisons(arr, num) {
	const result = [];
	for (let i = 0; i < num; i++) {
		const index1 = i % arr.length;
		const index2 = (i + 1) % arr.length;
		result.push([arr[index1], arr[index2]]);
	}
	return result;
}
