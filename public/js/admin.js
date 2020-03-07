const deleteProduct = async btn => {
  try {
    const csrf = btn.parentNode.querySelector("input[name='_csrf']").value;
    const productId = btn.parentNode.querySelector("input[name='productId']")
      .value;

    const productElement = btn.closest('article');

    const response = await fetch(`/admin/product/${productId}`, {
      method: 'DELETE',
      headers: {
        'csrf-token': csrf
      }
    });

    const data = await response.json();

    if (data.message === 'success') {
      productElement.remove();
    }

    console.log(data);
  } catch (err) {
    console.log(err);
  }
};
